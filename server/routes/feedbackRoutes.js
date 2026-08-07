import express from "express";
import { 
  submitFeedback, 
  getAllFeedback, 
  updateFeedbackStatus, 
  deleteFeedback 
} from "../controllers/feedbackController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/roleMiddleware.js";

const feedbackRouter = express.Router();

feedbackRouter.post("/submit", protect, submitFeedback);
feedbackRouter.get("/all", protect, requireAdmin, getAllFeedback);
feedbackRouter.post("/update-status", protect, requireAdmin, updateFeedbackStatus);
feedbackRouter.delete("/:feedbackId", protect, requireAdmin, deleteFeedback);

export default feedbackRouter;
