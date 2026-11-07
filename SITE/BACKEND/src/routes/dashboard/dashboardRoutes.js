import { Router } from "express";
import _auth3130 from "../../middleware/auth.js";
const { requireAuth } = _auth3130;
import _subscription5171 from "../../middleware/subscription.js";
const { requireSubscription } = _subscription5171;
import _dashboardController7485 from "../../controller/dashboard/dashboardController.js";
const {
  streamNotifications,
  getDashboard,
  setActiveCard,
  deleteRequest,
  deleteAppointment,
  markRequestRead,
  markAppointmentRead,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  setActivePaymentMethod,
  deletePaymentMethod,
} = _dashboardController7485;

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

// Authentication and current entitlements are loaded before every Dashboard endpoint.
router.get("/stream", streamNotifications);

router.get("/", getDashboard);
router.patch("/active-card", setActiveCard);
router.delete("/cards/:cardId/requests/:requestId", deleteRequest);
router.delete("/cards/:cardId/appointments/:appointmentId", deleteAppointment);
router.put("/cards/:cardId/requests/:requestId/read", markRequestRead);
router.put(
  "/cards/:cardId/appointments/:appointmentId/read",
  markAppointmentRead,
);

// Payment Methods endpoints
router.get("/payment-methods", getPaymentMethods);
router.post("/payment-methods", createPaymentMethod);
router.put("/payment-methods/:id", updatePaymentMethod);
router.patch("/payment-methods/:id/active", setActivePaymentMethod);
router.delete("/payment-methods/:id", deletePaymentMethod);

export default router;
