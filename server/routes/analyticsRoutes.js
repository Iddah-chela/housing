import express from "express";
import { trackVisit } from "../controllers/analyticsController.js";

const analyticsRouter = express.Router();

analyticsRouter.post("/visit", trackVisit);

export default analyticsRouter;
