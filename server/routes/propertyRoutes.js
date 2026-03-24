import express from "express";
import { protect, optionalProtect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { 
  createProperty, 
  getAllProperties, 
  getPropertyById, 
  getOwnerProperties,
  updateProperty,
  deleteProperty,
  toggleRoomAvailability,
  verifyListing,
  addCaretaker,
  removeCaretaker,
  getManagedProperties,
  caretakerToggleRoom,
  submitPropertyClaim,
  getPropertyClaimStatus,
  getMyPropertyClaims
} from "../controllers/propertyController.js";

const propertyRouter = express.Router();

// Public routes
propertyRouter.get('/', getAllProperties);

// Specific protected routes MUST come before /:id wildcard
propertyRouter.post('/', protect, createProperty);
propertyRouter.get('/owner/my-properties', protect, getOwnerProperties);
propertyRouter.post('/toggle-room', protect, toggleRoomAvailability);

// Caretaker routes
propertyRouter.get('/managed', protect, getManagedProperties);
propertyRouter.post('/caretaker-toggle-room', protect, caretakerToggleRoom);
propertyRouter.get('/claims/my', protect, getMyPropertyClaims);
propertyRouter.post('/:id/caretakers', protect, addCaretaker);
propertyRouter.delete('/:id/caretakers', protect, removeCaretaker);
propertyRouter.post('/:id/claim', protect, upload.array('evidenceFiles', 4), submitPropertyClaim);
propertyRouter.get('/:id/claim-status', protect, getPropertyClaimStatus);

// Wildcard routes last
propertyRouter.get('/:id', optionalProtect, getPropertyById);
propertyRouter.put('/:id', protect, updateProperty);
propertyRouter.delete('/:id', protect, deleteProperty);
propertyRouter.post('/:id/verify', protect, verifyListing); // Landlord refreshes listing

export default propertyRouter;
