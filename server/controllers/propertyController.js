import Property from "../models/property.js";
import User from "../models/user.js";
import UserPass from "../models/userPass.js";
import {v2 as cloudinary} from "cloudinary";
import Subscriber from "../models/subscriber.js";
import { sendNewListingAlert } from "../utils/mailer.js";

// Returns true if the requester has access to full property details (contact/whatsapp).
// Access is granted to: active pass holder, property owner, or caretaker.
// For guests: pass a completed, non-expired UserPass _id via x-guest-token header or guestToken query.
const hasContactAccess = async (propertyId, req) => {
  const userId = req.user?._id;
  const userEmail = req.user?.email;

  if (userId) {
    // Owner or caretaker always see their own property
    const prop = await Property.findById(propertyId).select('owner caretakers').lean();
    if (!prop) return false;
    if (prop.owner?.toString() === userId.toString()) return true;
    if (prop.caretakers?.some(e => e.toLowerCase() === userEmail?.toLowerCase())) return true;

    // Active pass (global or per-property)
    const pass = await UserPass.findOne({
      user: userId,
      paymentStatus: 'completed',
      expiresAt: { $gt: new Date() },
      $or: [
        { property: null },
        { property: { $exists: false } },
        { property: propertyId }
      ]
    });
    if (pass) return true;
  }

  // Guest token
  const guestToken = req.headers['x-guest-token'] || req.query.guestToken;
  if (guestToken) {
    try {
      const guestPass = await UserPass.findById(guestToken).lean();
      if (
        guestPass &&
        guestPass.paymentStatus === 'completed' &&
        guestPass.expiresAt > new Date() &&
        guestPass.property?.toString() === propertyId.toString()
      ) return true;
    } catch { /* invalid ObjectId — fall through */ }
  }

  return false;
};

// Create a new property with buildings and grid layout
export const createProperty = async (req, res) => {
  try {
    const { name, address, contact, whatsappNumber, place, estate, propertyType, buildings, images, compoundGate, googleMapsUrl } = req.body;
    const owner = req.user._id;

    console.log('Received property data:', { name, address, buildings: buildings?.length, images: images?.length });

    // Upload images to Cloudinary
    let uploadedImageUrls = [];
    if (images && images.length > 0) {
      const uploadPromises = images.map(async (base64Image) => {
        if (!base64Image) return null;
        
        // If it's already a URL, use it directly
        if (base64Image.startsWith('http')) {
          return base64Image;
        }
        
        // Otherwise upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64Image, {
          folder: 'house_properties',
          resource_type: 'auto'
        });
        return result.secure_url;
      });
      
      uploadedImageUrls = (await Promise.all(uploadPromises)).filter(url => url !== null);
    }

    // Parse buildings if they come as JSON string
    const parsedBuildings = typeof buildings === 'string' ? JSON.parse(buildings) : buildings;

    const property = await Property.create({
      owner,
      name,
      address,
      contact,
      whatsappNumber,
      place,
      estate,
      propertyType,
      googleMapsUrl: googleMapsUrl || '',
      buildings: parsedBuildings,
      images: uploadedImageUrls,
      compoundGate: compoundGate || { side: 'bottom' }
    });

    // Populate owner details
    await property.populate('owner', 'username email image');

    // Notify newsletter subscribers (non-blocking)
    Subscriber.find({}).then(subscribers => {
        if (subscribers.length > 0) {
            sendNewListingAlert(subscribers, property).catch(() => {});
        }
    }).catch(() => {});

    res.json({ 
      success: true, 
      message: "Property created successfully", 
      property 
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.json({ success: false, message: error.message });
  }
};

// Get all properties (for browsing) — exclude expired ones
export const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find({ vacantRooms: { $gt: 0 }, isExpired: { $ne: true } })
      .select('-contact -whatsappNumber')
      .populate('owner', 'username image isVerified')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, properties });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get a single property by ID
export const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id)
      .populate('owner', 'username image isVerified');
    
    if (!property) {
      return res.json({ success: false, message: "Property not found" });
    }

    const propertyObj = property.toObject();

    // Only reveal contact details to paying/authorised users
    if (!await hasContactAccess(id, req)) {
      delete propertyObj.contact;
      delete propertyObj.whatsappNumber;
    }
    
    res.json({ success: true, property: propertyObj });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get properties owned by the logged-in user
export const getOwnerProperties = async (req, res) => {
  try {
    const owner = req.user._id;
    const properties = await Property.find({ owner })
      .populate('owner', 'username email image')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, properties });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update property
export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, contact, whatsappNumber, place, estate, propertyType, buildings, images, compoundGate, googleMapsUrl } = req.body;
    const owner = req.user._id;

    // Verify ownership
    const existing = await Property.findOne({ _id: id, owner });
    if (!existing) {
      return res.json({ success: false, message: "Property not found or unauthorized" });
    }

    // Handle image uploads if new images provided
    let updatedImages = existing.images;
    if (images && images.length > 0) {
      const uploadPromises = images.map(async (image) => {
        if (!image) return null;
        if (image.startsWith('http')) return image;
        const result = await cloudinary.uploader.upload(image, {
          folder: 'house_properties',
          resource_type: 'auto'
        });
        return result.secure_url;
      });
      updatedImages = (await Promise.all(uploadPromises)).filter(url => url !== null);
    }

    // Parse buildings
    const parsedBuildings = typeof buildings === 'string' ? JSON.parse(buildings) : buildings;

    // Manually recalculate vacantRooms and totalRooms from the new grid
    let totalRooms = 0;
    let vacantRooms = 0;
    (parsedBuildings || existing.buildings).forEach(building => {
      (building.grid || []).forEach(row => {
        row.forEach(cell => {
          if (cell.type === 'room') {
            totalRooms++;
            if (cell.isVacant) vacantRooms++;
          }
        });
      });
    });

    // Use $set to bypass Mongoose change-detection on nested arrays entirely
    const updatePayload = {
      name: name || existing.name,
      address: address || existing.address,
      contact: contact || existing.contact,
      whatsappNumber: whatsappNumber || existing.whatsappNumber,
      place: place || existing.place,
      estate: estate || existing.estate,
      propertyType: propertyType || existing.propertyType,
      googleMapsUrl: googleMapsUrl !== undefined ? googleMapsUrl : (existing.googleMapsUrl || ''),
      images: updatedImages,
      totalRooms,
      vacantRooms,
    };
    if (parsedBuildings) updatePayload.buildings = parsedBuildings;
    if (compoundGate) updatePayload.compoundGate = compoundGate;

    const property = await Property.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true }
    );

    res.json({ success: true, message: "Property updated successfully", property });
  } catch (error) {
    console.error('Error updating property:', error);
    res.json({ success: false, message: error.message });
  }
};

// Delete property
export const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const owner = req.user._id;

    const property = await Property.findOneAndDelete({ _id: id, owner });
    
    if (!property) {
      return res.json({ success: false, message: "Property not found or unauthorized" });
    }

    // Delete images from Cloudinary
    if (property.images && property.images.length > 0) {
      const deletePromises = property.images.map(async (imageUrl) => {
        const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      });
      await Promise.all(deletePromises);
    }

    res.json({ success: true, message: "Property deleted successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Toggle room availability within a property
export const toggleRoomAvailability = async (req, res) => {
  try {
    const { propertyId, buildingId, row, col } = req.body;
    const owner = req.user._id;

    const property = await Property.findOne({ _id: propertyId, owner });
    if (!property) {
      return res.json({ success: false, message: "Property not found or unauthorized" });
    }

    // Find the building and cell
    const building = property.buildings.find(b => b.id === buildingId);
    if (!building) {
      return res.json({ success: false, message: "Building not found" });
    }

    const cell = building.grid[row][col];
    if (cell.type !== 'room') {
      return res.json({ success: false, message: "Not a room cell" });
    }

    // Toggle availability
    cell.isVacant = !cell.isVacant;
    
    await property.save(); // This will trigger the pre-save hook to recalculate totals

    res.json({ 
      success: true, 
      message: `Room ${cell.isVacant ? 'marked as vacant' : 'marked as occupied'}`,
      property 
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Landlord refreshes their listing (resets freshness timer)
export const verifyListing = async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, owner: req.user._id });
    if (!property) {
      return res.json({ success: false, message: "Property not found or unauthorized" });
    }

    property.lastVerifiedAt = new Date();
    property.isExpired = false;
    property.needsRefresh = false;
    await property.save();

    res.json({ success: true, message: "Listing refreshed! It's now active for another 30 days." });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ── Caretaker management ────────────────────────────────────────────────

// Add a caretaker email to a property (owner only)
export const addCaretaker = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const owner = req.user._id;

    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }

    const property = await Property.findOne({ _id: id, owner });
    if (!property) {
      return res.json({ success: false, message: "Property not found or unauthorized" });
    }

    // Check if email is already a caretaker
    const normalizedEmail = email.toLowerCase().trim();
    if (property.caretakers.includes(normalizedEmail)) {
      return res.json({ success: false, message: "This email is already a caretaker" });
    }

    // Verify the email belongs to a registered user (case-insensitive)
    const caretakerUser = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    if (!caretakerUser) {
      return res.json({ success: false, message: "No registered user found with that email" });
    }

    property.caretakers.push(normalizedEmail);
    await property.save();

    res.json({ 
      success: true, 
      message: `${caretakerUser.username} added as caretaker`,
      caretakers: property.caretakers
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Remove a caretaker email from a property (owner only)
export const removeCaretaker = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const owner = req.user._id;

    const property = await Property.findOne({ _id: id, owner });
    if (!property) {
      return res.json({ success: false, message: "Property not found or unauthorized" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    property.caretakers = property.caretakers.filter(e => e !== normalizedEmail);
    await property.save();

    res.json({ 
      success: true, 
      message: "Caretaker removed",
      caretakers: property.caretakers
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get properties where the logged-in user is a caretaker
export const getManagedProperties = async (req, res) => {
  try {
    const userEmail = req.user.email;
    if (!userEmail) {
      return res.json({ success: false, message: "User email not found" });
    }

    const properties = await Property.find({ 
      caretakers: { $regex: new RegExp(`^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    })
      .populate('owner', 'username email image')
      .sort({ createdAt: -1 });

    res.json({ success: true, properties });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Toggle room availability — also allows caretakers
export const caretakerToggleRoom = async (req, res) => {
  try {
    const { propertyId, buildingId, row, col } = req.body;
    const userEmail = req.user.email;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.json({ success: false, message: "Property not found" });
    }

    // Allow if user is owner OR caretaker
    const isOwner = property.owner === req.user._id;
    const isCaretaker = property.caretakers.some(e => e.toLowerCase() === userEmail?.toLowerCase());

    if (!isOwner && !isCaretaker) {
      return res.json({ success: false, message: "Unauthorized — you are not the owner or a caretaker" });
    }

    const building = property.buildings.find(b => b.id === buildingId);
    if (!building) {
      return res.json({ success: false, message: "Building not found" });
    }

    const cell = building.grid[row][col];
    if (cell.type !== 'room') {
      return res.json({ success: false, message: "Not a room cell" });
    }

    cell.isVacant = !cell.isVacant;
    cell.isBooked = false; // clear any pending booking when caretaker manually toggles
    await property.save();

    res.json({
      success: true,
      message: `Room ${cell.isVacant ? 'marked as vacant' : 'marked as occupied'}`,
      property
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
