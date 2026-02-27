import express from "express";
import { 
    createReport, 
    getAllReports, 
    updateReportStatus,
    getUserReports,
    suspendUser,
    unsuspendUser,
    removeListing,
    unverifyListing,
    warnUser
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";

const reportRouter = express.Router();

reportRouter.post("/create", protect, createReport);
reportRouter.get("/all", protect, getAllReports);
reportRouter.post("/update-status", protect, updateReportStatus);
reportRouter.get("/user-reports", protect, getUserReports);

// Enforcement actions (admin only)
reportRouter.post("/suspend-user", protect, suspendUser);
reportRouter.post("/unsuspend-user", protect, unsuspendUser);
reportRouter.post("/remove-listing", protect, removeListing);
reportRouter.post("/unverify-listing", protect, unverifyListing);
reportRouter.post("/warn-user", protect, warnUser);

export default reportRouter;
