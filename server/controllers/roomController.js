import House from "../models/house.js"
import {v2 as cloudinary} from "cloudinary";
import Room from "../models/room.js";

// api to create to create a new room for a house

export const createRoom = async (req, res) =>{
    try {
        const {roomType, pricePerMonth, amenities} = req.body;
        const house = await House.findOne({owner: req.auth.userId})

        if(!house) return res.json({success: false, message: "No House Found"});


        //upload images to cloudinary
        const uploadImages = req.files.map(async(file) => {
            const response = await cloudinary.uploader.upload(file.path);
            return response.secure_url;
        })
        // wait for all uploads to complete
        const images = await Promise.all(uploadImages)

        await Room.create({
            house: house._id,
            roomType,
            pricePerMonth: +pricePerMonth,
            amenities: JSON.parse(amenities),
            images,
        })
        res.json({success: true, message: "Room created successfully"})
    } catch (error) {
        res.json({success: false, message: message.error})
    }
}

//api to get all available rooms for browsing
export const getRooms = async (req, res) =>{
    try {
        const rooms = await Room.find({
            isAvailable: true,  // Owner has listed it
            availabilityStatus: { $in: ["available", "viewing_requested"] }  // Not booked
        }).populate({
            path: 'house',
            populate:{
                path: 'owner',
                select: 'image'
            }
        }).sort({createdAt: -1})
        res.json({success: true, rooms})
    } catch (error) {
         res.json({success: false, message: error.message})
    }
}

//api to get a single room by ID
export const getRoomById = async (req, res) =>{
    try {
        const { id } = req.params;
        const room = await Room.findById(id).populate({
            path: 'house',
            populate:{
                path: 'owner',
                select: 'image username isPhoneVerified isIdVerified averageResponseTime'
            }
        });
        
        if(!room) {
            return res.json({success: false, message: "Room not found"});
        }
        
        res.json({success: true, room});
    } catch (error) {
         res.json({success: false, message: error.message});
    }
}

//api to get all rooms for a specific house owner
export const getOwnerRooms = async (req, res) =>{
    try {
        const { userId } = req.auth();
        const houseData = await House.findOne({owner: userId});
        
        if(!houseData) {
            return res.json({success: false, message: "No house registered"});
        }

        const rooms = await Room.find({house: houseData._id.toString()}).populate("house");
        res.json({success: true, rooms});
    } catch (error) {
       res.json({success: false, message: error.message}) ;
    }
}

//api to toggle room availability
export const toggleRoomAvailability = async (req, res) =>{
    try {
        const {roomId} = req.body;
        const roomData = await Room.findById(roomId);
        roomData.isAvailable = !roomData.isAvailable;
        await roomData.save();
        res.json({success: true, message: "Room Availability Updated"});

    } catch (error) {
        res.json({success: false, message: error.message}) ;
    }
}

