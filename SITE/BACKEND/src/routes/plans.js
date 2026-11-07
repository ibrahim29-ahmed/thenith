import { Router } from "express";
import _planController8761 from "../controller/planController.js";
import authMiddleware from "../middleware/auth.js";
const { optionalAuth } = authMiddleware;
const { getPlans  } = _planController8761;

const router = Router();

router.get("/", optionalAuth, getPlans);

export default router;
