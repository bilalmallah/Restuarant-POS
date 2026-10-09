import express from "express";
import * as controller from "./employeeController.js";
import { employeeSchema } from "./employeeValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";
import { crudRoutes } from "../../utils/crudFactory.js";

const employeeRouter = express.Router();

employeeRouter.use(authMiddleware);

employeeRouter.get("/waiters", controller.listWaiters);
employeeRouter.get("/with-balances", requireRole("admin", "manager"), controller.listWithBalances);
employeeRouter.get("/:id/statement", requireRole("admin", "manager"), controller.getEmployeeStatement);

crudRoutes(employeeRouter, controller, {
  validator: validate(employeeSchema),
  guards: [requireRole("admin", "manager")],
});

export default employeeRouter;
