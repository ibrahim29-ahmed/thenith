import { Router } from "express";
import _productController5187 from "../controller/productController.js";
const { getPublicProduct, getPublicProducts, getPublicCategories, uploadCustomCardDesign } = _productController5187;

const router = Router();

router.get("/", getPublicProducts);
router.get("/categories", getPublicCategories);
router.post("/custom-card-design", uploadCustomCardDesign);
router.get("/:id", getPublicProduct);

export default router;
