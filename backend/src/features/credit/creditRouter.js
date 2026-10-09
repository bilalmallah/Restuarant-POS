import express from "express";
import * as controller from "./creditController.js";
import {
  creditPersonSchema,
  creditAccountSchema,
  creditTransactionSchema,
  updateCreditTransactionSchema,
} from "./creditValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";

const creditRouter = express.Router();

creditRouter.use(authMiddleware);

/* ---------------- Ledger-wide ---------------- */
creditRouter.get("/transactions", controller.listAllTransactions);

/* ---------------- People ---------------- */
creditRouter.get("/persons", controller.listPersons);
creditRouter.get("/persons/:id/statement", controller.getPersonStatement);
creditRouter.post(
  "/persons",
  requireRole("admin", "manager"),
  validate(creditPersonSchema),
  controller.createPerson
);
creditRouter.put(
  "/persons/:id",
  requireRole("admin", "manager"),
  validate(creditPersonSchema),
  controller.updatePerson
);
creditRouter.delete("/persons/:id", requireRole("admin"), controller.deletePerson);

/* ---------------- Accounts ---------------- */
creditRouter.get("/persons/:id/accounts", controller.listAccounts);
creditRouter.post(
  "/persons/:id/accounts",
  requireRole("admin", "manager"),
  validate(creditAccountSchema),
  controller.createAccount
);
creditRouter.put(
  "/persons/:id/accounts/:accountId",
  requireRole("admin", "manager"),
  validate(creditAccountSchema),
  controller.updateAccount
);
creditRouter.delete(
  "/persons/:id/accounts/:accountId",
  requireRole("admin", "manager"),
  controller.deleteAccount
);

/* ---------------- Transactions ---------------- */
creditRouter.post(
  "/persons/:id/transactions",
  validate(creditTransactionSchema),
  controller.createTransaction
);
creditRouter.put(
  "/persons/:id/transactions/:transactionId",
  requireRole("admin", "manager"),
  validate(updateCreditTransactionSchema),
  controller.updateTransaction
);
creditRouter.delete(
  "/persons/:id/transactions/:transactionId",
  requireRole("admin", "manager"),
  controller.deleteTransaction
);

export default creditRouter;
