import express from "express";
import { trackVisit } from "../controllers/analyticsController.js";

const analyticsRouter = express.Router();

analyticsRouter.post("/visit", trackVisit);
analyticsRouter.post("/site", trackVisit);

export default analyticsRouter;
