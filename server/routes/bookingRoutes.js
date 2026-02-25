import express from 'express';
import { createBooking, getPropertyBookings, getUserBookings, confirmMoveIn } from '../controllers/bookingController.js';
import { protect } from './../middleware/authMiddleware.js';

const  bookingRouter = express.Router();

bookingRouter.post('/book', protect, createBooking);
bookingRouter.post('/move-in', protect, confirmMoveIn);
bookingRouter.get('/user', protect, getUserBookings);
bookingRouter.get('/property', protect, getPropertyBookings);


export default bookingRouter;
