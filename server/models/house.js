import mongoose, { mongo } from "mongoose";

const houseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        required: true,
        ref:"User"
    },
    place: {
        type: String,
        required: true,
    },
    estate: {
        type: String,
        required: true
    },
    locationPin: {
        lat: Number,
        lng: Number
    },
    isVerified: {
        type: Boolean,
        default: false
    },
}, {timestamps: true});

const House = mongoose.model("House", houseSchema);

export default House;