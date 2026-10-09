import * as yup from "yup";
import { ORDER_TYPES, PAYMENT_METHODS, DISCOUNT_TYPES } from "./orderModel.js";

export const createOrderSchema = yup.object({
  tableId: yup.number().integer().nullable().default(null),
  waiterId: yup.number().integer().nullable().default(null),
  orderType: yup.string().oneOf(ORDER_TYPES).default("dine-in"),
  guests: yup.number().integer().min(1).default(1),
  customerName: yup.string().trim().nullable().default(null),
  customerPhone: yup.string().trim().nullable().default(null),
  note: yup.string().trim().nullable().default(null),
  items: yup
    .array(
      yup.object({
        productId: yup.number().integer().nullable().default(null),
        name: yup.string().trim().required("Item name is required"),
        unitPrice: yup.number().min(0).required(),
        quantity: yup.number().moreThan(0, "Quantity must be more than zero").required(),
        note: yup.string().trim().nullable().default(null),
      })
    )
    .default([]),
});

export const updateOrderSchema = yup.object({
  tableId: yup.number().integer().nullable(),
  waiterId: yup.number().integer().nullable(),
  orderType: yup.string().oneOf(ORDER_TYPES),
  guests: yup.number().integer().min(1),
  customerName: yup.string().trim().nullable(),
  customerPhone: yup.string().trim().nullable(),
  note: yup.string().trim().nullable(),
  discountType: yup.string().oneOf(DISCOUNT_TYPES),
  discountValue: yup.number().min(0),
  taxPercent: yup.number().min(0).max(100),
  serviceCharge: yup.number().min(0),
  deliveryCharge: yup.number().min(0),
  commissionPercent: yup.number().min(0).max(100),
});

export const addItemSchema = yup.object({
  productId: yup.number().integer().nullable().default(null),
  name: yup.string().trim().required("Item name is required"),
  variantLabel: yup.string().trim().nullable().default(null),
  unitPrice: yup.number().min(0).required("Price is required"),
  quantity: yup.number().moreThan(0, "Quantity must be more than zero").default(1),
  note: yup.string().trim().nullable().default(null),
  printToKitchen: yup.boolean().nullable().default(null),
});

export const updateItemSchema = yup.object({
  /**
   * Quantity may reach zero here: a returned cold drink is "quantity minus one"
   * from the waiter's point of view, and the controller turns a zero-quantity
   * line into a delete so the bill stays clean.
   */
  quantity: yup.number().min(0),
  unitPrice: yup.number().min(0),
  note: yup.string().trim().nullable(),
  isReturned: yup.boolean(),
  returnReason: yup.string().trim().nullable(),
});

export const settleOrderSchema = yup.object({
  paymentMethod: yup.string().oneOf(PAYMENT_METHODS).required("Choose a payment method"),
  paidAmount: yup.number().min(0).required("Enter the amount received"),
  tenderedAmount: yup.number().min(0).default(0),
  note: yup.string().trim().nullable().default(null),
});

export const creditOrderSchema = yup.object({
  creditPersonId: yup.number().integer().required("Choose who is taking this on credit"),
  creditAccountId: yup.number().integer().required("Choose the account"),
  /** Part-cash, part-credit: whatever was handed over now. */
  paidAmount: yup.number().min(0).default(0),
  description: yup.string().trim().nullable().default(null),
});

export const voidOrderSchema = yup.object({
  voidReason: yup.string().trim().required("A reason is required to cancel a bill"),
  /**
   * Cancelling is how a bill disappears from the day's takings, so it is the
   * one action that asks the person at the till to prove who they are. Checked
   * against their own account on the server - the dialog cannot be bypassed.
   */
  password: yup.string().required("Enter your password to cancel a bill"),
});
