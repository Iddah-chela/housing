import User from "../models/user.js";
import Property from "../models/property.js";
import { hasRole } from "../utils/roleUtils.js";
// GET /api/user/

export const getUserData = async (req, res) => {
    try {
        const role = req.user.role || 'user';
        const roles = req.user.roles || [];
        const recentSearchedPlaces = req.user.recentSearchedPlaces || [];
        const image = req.user.image || null;
        const email = req.user.email || '';

        // Caretaker if platform role OR email on any property.caretakers
        let isCaretaker = hasRole(req.user, 'caretaker');
        if (!isCaretaker && email) {
            const managed = await Property.findOne({
                caretakers: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            }).select('_id').lean();
            isCaretaker = !!managed;
        }

        res.json({success: true, role, roles, recentSearchedPlaces, image, isCaretaker})
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
