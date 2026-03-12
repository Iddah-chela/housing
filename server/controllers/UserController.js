import User from "../models/user.js";
import Property from "../models/property.js";
// GET /api/user/

export const getUserData = async (req, res) => {
    try {
        const role = req.user.role || 'user';
        const recentSearchedPlaces = req.user.recentSearchedPlaces || [];
        const image = req.user.image || null;
        const email = req.user.email || '';

        // Check if user is a caretaker for any property
        let isCaretaker = false;
        if (email) {
            const managed = await Property.findOne({
                caretakers: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            }).select('_id').lean();
            isCaretaker = !!managed;
        }

        res.json({success: true, role, recentSearchedPlaces, image, isCaretaker})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


// Store user recent searched places

export const storeRecentSearchedPlaces = async (req, res) => {
    try {
        const {recentSearchedPlace} = req.body;
        const user = await req.user;
         
        if(user.recentSearchedPlaces.length < 3) {
            user.recentSearchedPlaces.push(recentSearchedPlace)
        } else{
            user.recentSearchedPlaces.shift();
            user.recentSearchedPlaces.push(recentSearchedPlace)
        }

        await user.save();
        res.json({success: true, message: "place Added"})
    } catch (error) {
         res.json({success: false, message: error.message})
    }
};
