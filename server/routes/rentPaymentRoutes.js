import express from 'express';
import { getRentPayments, toggleRentPayment, setPaymentAmount } from '../controllers/rentPaymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const rentPaymentRouter = express.Router();

rentPaymentRouter.get('/:propertyId', protect, getRentPayments);
rentPaymentRouter.post('/toggle', protect, toggleRentPayment);
rentPaymentRouter.post('/set-amount', protect, setPaymentAmount);

export default rentPaymentRouter;
