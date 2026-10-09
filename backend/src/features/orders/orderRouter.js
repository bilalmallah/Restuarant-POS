import express from "express";
import * as controller from "./orderController.js";
import {
  createOrderSchema,
  updateOrderSchema,
  addItemSchema,
  updateItemSchema,
  settleOrderSchema,
  creditOrderSchema,
  voidOrderSchema,
} from "./orderValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";

const orderRouter = express.Router();

orderRouter.use(authMiddleware);

/* ---------------- Reading ---------------- */
orderRouter.get("/", controller.listOrders);
orderRouter.get("/active", controller.listActiveOrders);
orderRouter.get("/:id", controller.getOrder);

/* ---------------- Order lifecycle ---------------- */
orderRouter.post("/", validate(createOrderSchema), controller.createOrder);
orderRouter.put("/:id", validate(updateOrderSchema), controller.updateOrder);

/* ---------------- Items ---------------- */
orderRouter.post("/:id/items", validate(addItemSchema), controller.addOrderItem);
orderRouter.patch("/:id/items/:itemId", validate(updateItemSchema), controller.updateOrderItem);
orderRouter.delete("/:id/items/:itemId", controller.removeOrderItem);

/* ---------------- Printing ---------------- */
orderRouter.post("/:id/token", controller.printKitchenToken);
orderRouter.post("/:id/bill", controller.printBill);

/* ---------------- Settlement ---------------- */
orderRouter.post("/:id/settle", validate(settleOrderSchema), controller.settleOrder);
orderRouter.post("/:id/credit", validate(creditOrderSchema), controller.sendOrderToCredit);

/* ---------------- Corrections (managers only) ---------------- */
orderRouter.post(
  "/:id/void",
  requireRole("admin", "manager"),
  validate(voidOrderSchema),
  controller.voidOrder
);
orderRouter.post("/:id/reopen", requireRole("admin", "manager"), controller.reopenOrder);
orderRouter.delete("/:id", requireRole("admin"), controller.deleteOrder);

export default orderRouter;
