import express from 'express';
import { createBooking, getPropertyBookings, getUserBookings, confirmMoveIn, confirmMoveInAsOwner, handleMoveInAction, giveNotice, confirmMoveOut, handleMoveOutAction } from '../controllers/bookingController.js';
import { protect } from './../middleware/authMiddleware.js';

const  bookingRouter = express.Router();

bookingRouter.post('/book', protect, createBooking);
bookingRouter.post('/move-in', protect, confirmMoveIn);
bookingRouter.post('/move-in-as-owner', protect, confirmMoveInAsOwner);
bookingRouter.post('/give-notice', protect, giveNotice);
bookingRouter.post('/confirm-move-out', protect, confirmMoveOut);
bookingRouter.get('/user', protect, getUserBookings);
bookingRouter.get('/property', protect, getPropertyBookings);
bookingRouter.get('/move-in-action', handleMoveInAction); // token-based, no auth
bookingRouter.get('/move-out-action', handleMoveOutAction); // token-based, no auth

export default bookingRouter;
