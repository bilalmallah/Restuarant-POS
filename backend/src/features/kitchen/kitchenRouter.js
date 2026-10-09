import express from "express";
import * as controller from "./kitchenController.js";
import { kitchenCategorySchema, kitchenItemSchema } from "./kitchenValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";
import { crudRoutes } from "../../utils/crudFactory.js";

const kitchenRouter = express.Router();
const guards = [requireRole("admin", "manager")];

kitchenRouter.use(authMiddleware);

/** Store list grouped by category - the shape both kitchen screens start from. */
kitchenRouter.get("/items/grouped", controller.getItemsGrouped);

const categoryRouter = crudRoutes(express.Router(), controller.categories, {
  validator: validate(kitchenCategorySchema),
  guards,
});

const itemRouter = crudRoutes(express.Router(), controller.items, {
  validator: validate(kitchenItemSchema),
  guards,
});

kitchenRouter.use("/categories", categoryRouter);
kitchenRouter.use("/items", itemRouter);

export default kitchenRouter;
