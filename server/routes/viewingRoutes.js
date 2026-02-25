import express from "express";
import { 
    createViewingRequest, 
    respondToViewingRequest, 
    getUserViewingRequests,
    markViewingCompleted 
} from "../controllers/viewingController.js";
import { protect } from "../middleware/authMiddleware.js";

const viewingRouter = express.Router();

viewingRouter.post("/create", protect, createViewingRequest);
viewingRouter.post("/respond", protect, respondToViewingRequest);
viewingRouter.get("/user-requests", protect, getUserViewingRequests);
viewingRouter.post("/mark-completed", protect, markViewingCompleted);

export default viewingRouter;
