import express from "express";
import { protect, optionalProtect } from "../middleware/authMiddleware.js";
import upload, { singleFile } from "../middleware/uploadMiddleware.js";
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
  getMyPropertyClaims,
  uploadPropertyVideo,
} from "../controllers/propertyController.js";
import {
  requestManageProperty,
  getOwnerCaretakerRequests,
  respondCaretakerManageRequest,
  getMyManageRequests,
} from "../controllers/caretakerManageController.js";

const propertyRouter = express.Router();

// Public routes
propertyRouter.get('/', getAllProperties);

// Specific protected routes MUST come before /:id wildcard
propertyRouter.post('/', protect, createProperty);
propertyRouter.post('/upload-video', protect, singleFile('file'), uploadPropertyVideo);
propertyRouter.get('/owner/my-properties', protect, getOwnerProperties);
propertyRouter.post('/toggle-room', protect, toggleRoomAvailability);

// Caretaker routes
propertyRouter.get('/managed', protect, getManagedProperties);
propertyRouter.post('/caretaker-toggle-room', protect, caretakerToggleRoom);
propertyRouter.get('/claims/my', protect, getMyPropertyClaims);
propertyRouter.get('/caretaker-requests/owner', protect, getOwnerCaretakerRequests);
propertyRouter.get('/caretaker-requests/mine', protect, getMyManageRequests);
propertyRouter.post('/caretaker-requests/:requestId/respond', protect, respondCaretakerManageRequest);
propertyRouter.post('/:id/caretakers', protect, addCaretaker);
propertyRouter.delete('/:id/caretakers', protect, removeCaretaker);
propertyRouter.post('/:id/request-manage', protect, requestManageProperty);
propertyRouter.post('/:id/claim', protect, upload.array('evidenceFiles', 4), submitPropertyClaim);
propertyRouter.get('/:id/claim-status', protect, getPropertyClaimStatus);

// Wildcard routes last
propertyRouter.get('/:id', optionalProtect, getPropertyById);
propertyRouter.put('/:id', protect, updateProperty);
propertyRouter.delete('/:id', protect, deleteProperty);
propertyRouter.post('/:id/verify', protect, verifyListing);

export default propertyRouter;
