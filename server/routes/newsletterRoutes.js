import express from 'express';
import { subscribe, unsubscribe, getSubscribers } from '../controllers/newsletterController.js';

const newsletterRouter = express.Router();

newsletterRouter.post('/subscribe', subscribe);
newsletterRouter.post('/unsubscribe', unsubscribe);
newsletterRouter.get('/subscribers', getSubscribers);

export default newsletterRouter;
