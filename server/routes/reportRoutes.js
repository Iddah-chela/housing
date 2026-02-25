import express from "express";
import { 
    createReport, 
    getAllReports, 
    updateReportStatus,
    getUserReports 
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";

const reportRouter = express.Router();

reportRouter.post("/create", protect, createReport);
reportRouter.get("/all", protect, getAllReports);
reportRouter.post("/update-status", protect, updateReportStatus);
reportRouter.get("/user-reports", protect, getUserReports);

export default reportRouter;
