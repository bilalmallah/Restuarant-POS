import * as yup from "yup";
import { LEDGER_TYPES } from "./employeeLedgerModel.js";

export const ledgerEntrySchema = yup.object({
  employeeId: yup.number().integer().required("Choose an employee"),
  type: yup.string().oneOf(LEDGER_TYPES, "Choose a valid entry type").required("Choose an entry type"),
  amount: yup.number().moreThan(0, "Amount must be more than zero").required("Enter an amount"),
  entryDate: yup.date().required("Choose a date"),
  periodMonth: yup
    .string()
    .matches(/^\d{4}-\d{2}$/, "Use the YYYY-MM format")
    .nullable()
    .default(null),
  description: yup.string().trim().nullable().default(null),
});

export const updateLedgerEntrySchema = yup.object({
  amount: yup.number().moreThan(0, "Amount must be more than zero"),
  entryDate: yup.date(),
  description: yup.string().trim().nullable(),
});

export const postSalarySchema = yup.object({
  /** Omit to post for every active employee on that pay type at once. */
  employeeIds: yup.array(yup.number().integer()).nullable().default(null),
  periodMonth: yup
    .string()
    .matches(/^\d{4}-\d{2}$/, "Use the YYYY-MM format")
    .required("Choose a month"),
  entryDate: yup.date().nullable().default(null),
});

export const payoutSchema = yup.object({
  employeeId: yup.number().integer().required("Choose an employee"),
  amount: yup.number().moreThan(0, "Amount must be more than zero").required("Enter an amount"),
  entryDate: yup.date().required("Choose a date"),
  description: yup.string().trim().nullable().default(null),
});

export const dailyCommissionSchema = yup.object({
  entryDate: yup.date().required("Choose a date"),
  rows: yup
    .array(
      yup.object({
        employeeId: yup.number().integer().required(),
        amount: yup.number().min(0).required(),
        description: yup.string().trim().nullable().default(null),
      })
    )
    .min(1, "Nothing to save")
    .required(),
});
