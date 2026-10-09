import express from "express";
import * as controller from "./productController.js";
import { productSchema, bulkPriceSchema } from "./productValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";
import { crudRoutes } from "../../utils/crudFactory.js";

const productRouter = express.Router();

productRouter.use(authMiddleware);

productRouter.get("/menu", controller.getMenu);
productRouter.patch(
  "/bulk-price",
  requireRole("admin", "manager"),
  validate(bulkPriceSchema),
  controller.bulkUpdatePrices
);

crudRoutes(productRouter, controller, {
  validator: validate(productSchema),
  guards: [requireRole("admin", "manager")],
});

export default productRouter;
