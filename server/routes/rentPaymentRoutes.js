import express from 'express';
import { getRentPayments, toggleRentPayment, setPaymentAmount, getRentSummary, sendRentReminder } from '../controllers/rentPaymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const rentPaymentRouter = express.Router();

rentPaymentRouter.get('/owner/summary', protect, getRentSummary);
rentPaymentRouter.get('/:propertyId', protect, getRentPayments);
rentPaymentRouter.post('/toggle', protect, toggleRentPayment);
rentPaymentRouter.post('/set-amount', protect, setPaymentAmount);
rentPaymentRouter.post('/remind', protect, sendRentReminder);

export default rentPaymentRouter;
