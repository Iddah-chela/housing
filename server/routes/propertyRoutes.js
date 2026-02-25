import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  createProperty, 
  getAllProperties, 
  getPropertyById, 
  getOwnerProperties,
  updateProperty,
  deleteProperty,
  toggleRoomAvailability,
  verifyListing
} from "../controllers/propertyController.js";

const propertyRouter = express.Router();

// Public routes
propertyRouter.get('/', getAllProperties);

// Specific protected routes MUST come before /:id wildcard
propertyRouter.post('/', protect, createProperty);
propertyRouter.get('/owner/my-properties', protect, getOwnerProperties);
propertyRouter.post('/toggle-room', protect, toggleRoomAvailability);

// Wildcard routes last
propertyRouter.get('/:id', getPropertyById);
propertyRouter.put('/:id', protect, updateProperty);
propertyRouter.delete('/:id', protect, deleteProperty);
propertyRouter.post('/:id/verify', protect, verifyListing); // Landlord refreshes listing

export default propertyRouter;
