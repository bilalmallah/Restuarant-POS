import * as yup from "yup";
import { KITCHEN_UNITS } from "./kitchenItemModel.js";

export const kitchenCategorySchema = yup.object({
  name: yup.string().trim().required("Category name is required"),
  /**
   * Deliberately no default: the edit forms do not send a sort order, and
   * defaulting it to 0 here made saving a name change jump the row to the front
   * of the floor / menu. Left undefined, Sequelize simply does not touch it.
   */
  sortOrder: yup.number().integer(),
  isActive: yup.boolean().default(true),
});

export const kitchenItemSchema = yup.object({
  name: yup.string().trim().required("Item name is required"),
  kitchenCategoryId: yup.number().integer().required("Choose a category"),
  unit: yup.string().oneOf(KITCHEN_UNITS, "Choose a valid unit").default("kg"),
  minQuantity: yup.number().min(0).default(0),
  defaultOrderQuantity: yup.number().min(0).default(0),
  supplier: yup.string().trim().nullable().default(null),
  /**
   * Deliberately no default: the edit forms do not send a sort order, and
   * defaulting it to 0 here made saving a name change jump the row to the front
   * of the floor / menu. Left undefined, Sequelize simply does not touch it.
   */
  sortOrder: yup.number().integer(),
  isActive: yup.boolean().default(true),
});
