import express from "express";
import * as controller from "./payrollController.js";
import {
  ledgerEntrySchema,
  updateLedgerEntrySchema,
  postSalarySchema,
  payoutSchema,
  dailyCommissionSchema,
} from "./payrollValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";

const payrollRouter = express.Router();

payrollRouter.use(authMiddleware, requireRole("admin", "manager"));

/* ---------------- Overview ---------------- */
payrollRouter.get("/summary", controller.getPayrollSummary);
payrollRouter.get("/commission-from-sales", controller.getCommissionFromSales);

/* ---------------- Ledger ---------------- */
payrollRouter.get("/entries", controller.listEntries);
payrollRouter.post("/entries", validate(ledgerEntrySchema), controller.createEntry);
payrollRouter.put("/entries/:id", validate(updateLedgerEntrySchema), controller.updateEntry);
payrollRouter.delete("/entries/:id", controller.deleteEntry);

/* ---------------- Shortcuts ---------------- */
payrollRouter.post("/advance", validate(payoutSchema), controller.recordAdvance);
payrollRouter.post("/payment", validate(payoutSchema), controller.recordPayment);
payrollRouter.post("/post-salaries", validate(postSalarySchema), controller.postSalaries);
payrollRouter.post(
  "/daily-commissions",
  validate(dailyCommissionSchema),
  controller.saveDailyCommissions
);

export default payrollRouter;
