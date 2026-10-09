import * as yup from "yup";
import { STOCK_STATUSES } from "./closingItemModel.js";

export const openClosingSchema = yup.object({
  businessDate: yup.date().nullable().default(null),
});

export const saveClosingSchema = yup.object({
  note: yup.string().trim().nullable(),
  items: yup
    .array(
      yup.object({
        id: yup.number().integer().required(),
        status: yup.string().oneOf(STOCK_STATUSES),
        inStockQuantity: yup.number().min(0),
        demandQuantity: yup.number().min(0),
        note: yup.string().trim().nullable(),
      })
    )
    .default([]),
});

export const completeClosingSchema = yup.object({
  note: yup.string().trim().nullable().default(null),
});
