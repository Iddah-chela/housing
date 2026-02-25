import Property from "../models/property.js";
import User from "../models/user.js";
import {v2 as cloudinary} from "cloudinary";
import Subscriber from "../models/subscriber.js";
import { sendNewListingAlert } from "../utils/mailer.js";

// Create a new property with buildings and grid layout
export const createProperty = async (req, res) => {
  try {
    const { name, address, contact, whatsappNumber, place, estate, propertyType, buildings, images, compoundGate } = req.body;
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
      buildings: parsedBuildings,
      images: uploadedImageUrls,
      compoundGate: compoundGate || { side: 'bottom' }
    });

    // Populate owner details
    await property.populate('owner', 'fullName email imageUrl');

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
      .populate('owner', 'fullName email imageUrl isVerified')
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
      .populate('owner', 'fullName email imageUrl isVerified');
    
    if (!property) {
      return res.json({ success: false, message: "Property not found" });
    }
    
    res.json({ success: true, property });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get properties owned by the logged-in user
export const getOwnerProperties = async (req, res) => {
  try {
    const owner = req.user._id;
    const properties = await Property.find({ owner })
      .populate('owner', 'fullName email imageUrl')
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
    const { name, address, contact, whatsappNumber, place, estate, propertyType, buildings, images, compoundGate } = req.body;
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
