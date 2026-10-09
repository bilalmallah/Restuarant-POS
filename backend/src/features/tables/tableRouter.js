import express from "express";
import * as controller from "./tableController.js";
import { tableSchema } from "./tableValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";
import { crudRoutes } from "../../utils/crudFactory.js";

const tableRouter = express.Router();

tableRouter.use(authMiddleware);

tableRouter.get("/floor", controller.getFloor);
tableRouter.post("/transfer", controller.transferOrder);

crudRoutes(tableRouter, controller, {
  validator: validate(tableSchema),
  guards: [requireRole("admin", "manager")],
});

export default tableRouter;
