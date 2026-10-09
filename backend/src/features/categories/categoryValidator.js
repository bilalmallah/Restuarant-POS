import * as yup from "yup";

export const categorySchema = yup.object({
  name: yup.string().trim().required("Category name is required"),
  colour: yup.string().trim().default("#2563eb"),
  /**
   * Deliberately no default: the edit forms do not send a sort order, and
   * defaulting it to 0 here made saving a name change jump the row to the front
   * of the floor / menu. Left undefined, Sequelize simply does not touch it.
   */
  sortOrder: yup.number().integer(),
  isActive: yup.boolean().default(true),
});
