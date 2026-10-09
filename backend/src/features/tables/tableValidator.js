import * as yup from "yup";
import { TABLE_STATUSES } from "./tableModel.js";

export const tableSchema = yup.object({
  name: yup.string().trim().required("Table name is required"),
  area: yup.string().trim().default("Main Hall"),
  capacity: yup.number().integer().min(1, "Capacity must be at least 1").default(4),
  status: yup.string().oneOf(TABLE_STATUSES).default("free"),
  /**
   * Deliberately no default: the edit forms do not send a sort order, and
   * defaulting it to 0 here made saving a name change jump the row to the front
   * of the floor / menu. Left undefined, Sequelize simply does not touch it.
   */
  sortOrder: yup.number().integer(),
  isActive: yup.boolean().default(true),
});
