import * as yup from "yup";

export const productSchema = yup.object({
  name: yup.string().trim().required("Product name is required"),
  description: yup.string().trim().nullable().default(null),
  variantLabel: yup.string().trim().nullable().default(null),
  code: yup.string().trim().nullable().default(null),
  categoryId: yup.number().integer().required("Please choose a category"),
  price: yup.number().min(0, "Price cannot be negative").required("Price is required"),
  printToKitchen: yup.boolean().default(true),
  commissionPercent: yup.number().min(0).max(100).nullable().default(null),
  /**
   * Deliberately no default: the edit forms do not send a sort order, and
   * defaulting it to 0 here made saving a name change jump the row to the front
   * of the floor / menu. Left undefined, Sequelize simply does not touch it.
   */
  sortOrder: yup.number().integer(),
  isActive: yup.boolean().default(true),
});

export const bulkPriceSchema = yup.object({
  items: yup
    .array(
      yup.object({
        id: yup.number().integer().required(),
        price: yup.number().min(0).required(),
      })
    )
    .min(1, "Nothing to update")
    .required(),
});
