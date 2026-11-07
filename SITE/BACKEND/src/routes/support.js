import { Router } from "express";
import _supportController9771 from "../controller/supportController.js";
const { optionalAuth,
  initCustomerService,
  getMessages,
  sendMessage,
  handleInternalEvent,
 } = _supportController9771;
import _rateLimit964 from "../middleware/rateLimit.js";
const { supportRateLimit  } = _rateLimit964;

const router = Router();

router.post("/internal-event", handleInternalEvent);
router.post("/init", supportRateLimit, optionalAuth, initCustomerService);
router.get("/:id/messages", supportRateLimit, optionalAuth, getMessages);
router.post("/:id/messages", supportRateLimit, optionalAuth, sendMessage);

export default router;
