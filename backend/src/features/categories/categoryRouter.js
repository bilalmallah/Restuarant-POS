import express from "express";
import * as controller from "./categoryController.js";
import { categorySchema } from "./categoryValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";
import { crudRoutes } from "../../utils/crudFactory.js";

const categoryRouter = express.Router();

categoryRouter.use(authMiddleware);

crudRoutes(categoryRouter, controller, {
  validator: validate(categorySchema),
  guards: [requireRole("admin", "manager")],
});

export default categoryRouter;
