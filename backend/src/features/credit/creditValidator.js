import * as yup from "yup";
import { CREDIT_TXN_TYPES } from "./creditTransactionModel.js";

export const creditPersonSchema = yup.object({
  name: yup.string().trim().required("Name is required"),
  phone: yup.string().trim().nullable().default(null),
  company: yup.string().trim().nullable().default(null),
  address: yup.string().trim().nullable().default(null),
  creditLimit: yup.number().min(0).default(0),
  isActive: yup.boolean().default(true),
  notes: yup.string().trim().nullable().default(null),
  /** Balance carried over from the paper book, posted to the default account. */
  openingBalance: yup.number().min(0).default(0),
});

export const creditAccountSchema = yup.object({
  name: yup.string().trim().required("Account name is required"),
  openingBalance: yup.number().min(0).default(0),
  isActive: yup.boolean().default(true),
});

export const creditTransactionSchema = yup.object({
  creditAccountId: yup.number().integer().required("Choose an account"),
  type: yup.string().oneOf(CREDIT_TXN_TYPES).required("Choose credit or payment"),
  amount: yup.number().moreThan(0, "Amount must be more than zero").required("Enter an amount"),
  entryDate: yup.date().required("Choose a date"),
  paymentMethod: yup.string().trim().nullable().default(null),
  description: yup.string().trim().nullable().default(null),
});

export const updateCreditTransactionSchema = yup.object({
  amount: yup.number().moreThan(0, "Amount must be more than zero"),
  entryDate: yup.date(),
  paymentMethod: yup.string().trim().nullable(),
  description: yup.string().trim().nullable(),
});
