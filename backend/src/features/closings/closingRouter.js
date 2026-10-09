import express from "express";
import * as controller from "./closingController.js";
import { openClosingSchema, saveClosingSchema, completeClosingSchema } from "./closingValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";

const closingRouter = express.Router();

closingRouter.use(authMiddleware);

closingRouter.get("/", controller.listClosings);
closingRouter.post("/open", validate(openClosingSchema), controller.openClosing);
closingRouter.get("/by-date/:date", controller.getClosingByDate);
closingRouter.get("/:id", controller.getClosing);
closingRouter.get("/:id/shopping-list", controller.getShoppingList);
closingRouter.put("/:id/items", validate(saveClosingSchema), controller.saveClosingItems);
closingRouter.post("/:id/complete", validate(completeClosingSchema), controller.completeClosing);
closingRouter.post("/:id/reopen", requireRole("admin", "manager"), controller.reopenClosing);
closingRouter.delete("/:id", requireRole("admin", "manager"), controller.deleteClosing);

export default closingRouter;
