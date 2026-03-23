import express from "express";
import { 
    suspendUser,
    unsuspendUser,
    unverifyListing,
    hideRoom,
    verifyUser,
    verifyHouse,
    getAllUsers,
    getAllRooms,
    getDashboardStats,
    isAdmin,
    getAllProperties,
    delistProperty,
    relistProperty,
    verifyProperty,
    unverifyProperty,
    deleteUser,
    revokeHouseOwner,
    transferProperty,
    getPropertyClaims,
    approvePropertyClaim,
    rejectPropertyClaim
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";

const adminRouter = express.Router();

// All admin routes require authentication and admin role
adminRouter.use(protect);
adminRouter.use(isAdmin);

adminRouter.post("/suspend-user", suspendUser);
adminRouter.post("/unsuspend-user", unsuspendUser);
adminRouter.post("/unverify-listing", unverifyListing);
adminRouter.post("/hide-room", hideRoom);
adminRouter.post("/verify-user", verifyUser);
adminRouter.post("/verify-house", verifyHouse);
adminRouter.post("/delete-user", deleteUser);
adminRouter.get("/users", getAllUsers);
adminRouter.get("/rooms", getAllRooms);
adminRouter.get("/stats", getDashboardStats);
adminRouter.get("/properties", getAllProperties);
adminRouter.post("/delist-property", delistProperty);
adminRouter.post("/relist-property", relistProperty);
adminRouter.post("/verify-property", verifyProperty);
adminRouter.post("/unverify-property", unverifyProperty);
adminRouter.post("/revoke-landlord", revokeHouseOwner);
adminRouter.post("/transfer-property", transferProperty);
adminRouter.get("/claims", getPropertyClaims);
adminRouter.post("/claims/:claimId/approve", approvePropertyClaim);
adminRouter.post("/claims/:claimId/reject", rejectPropertyClaim);

export default adminRouter;
