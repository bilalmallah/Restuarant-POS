import express from "express";
import * as controller from "./expenseController.js";
import { expenseSchema } from "./expenseValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";

const expenseRouter = express.Router();

expenseRouter.use(authMiddleware);

expenseRouter.get("/categories", controller.listCategories);
expenseRouter.get("/", controller.listExpenses);
expenseRouter.get("/:id", controller.getExpense);
expenseRouter.post("/", validate(expenseSchema), controller.createExpense);
expenseRouter.put("/:id", validate(expenseSchema), controller.updateExpense);
expenseRouter.delete("/:id", requireRole("admin", "manager"), controller.deleteExpense);

export default expenseRouter;
