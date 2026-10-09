import Product from "./productModel.js";
import Category from "../categories/categoryModel.js";
import { crudController } from "../../utils/crudFactory.js";
import { asyncHandler } from "../../utils/helperFunctions.js";

const include = [{ model: Category, as: "category", attributes: ["id", "name", "colour"] }];

const controller = crudController({
  model: Product,
  label: "Product",
  searchFields: ["name", "code"],
  include,
  defaultOrder: [["sortOrder", "ASC"], ["name", "ASC"]],
});

/**
 * Everything the POS order screen needs to paint the menu, in one call.
 * The till is often on a weak connection, so it loads the whole menu once and
 * filters locally rather than hitting the API on every category tap.
 */
export const getMenu = asyncHandler(async (_req, res) => {
  const categories = await Category.findAll({
    where: { isActive: true },
    order: [["sortOrder", "ASC"], ["name", "ASC"]],
    include: [
      {
        model: Product,
        as: "products",
        where: { isActive: true },
        required: false,
        separate: true,
        order: [["sortOrder", "ASC"], ["name", "ASC"]],
      },
    ],
  });

  res.status(200).json(
    categories.map((category) => ({
      id: category.id,
      name: category.name,
      colour: category.colour,
      products: category.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        variantLabel: product.variantLabel,
        code: product.code,
        price: Number(product.price),
        categoryId: product.categoryId,
        categoryName: category.name,
        printToKitchen: product.printToKitchen,
        commissionPercent: product.commissionPercent === null ? null : Number(product.commissionPercent),
      })),
    }))
  );
});

/** Re-pricing a whole category at once - one save instead of forty. */
export const bulkUpdatePrices = asyncHandler(async (req, res) => {
  const { items } = req.body;

  await Product.sequelize.transaction(async (transaction) => {
    await Promise.all(
      items.map(({ id, price }) => Product.update({ price }, { where: { id }, transaction }))
    );
  });

  res.status(200).json({ message: `${items.length} price${items.length === 1 ? "" : "s"} updated` });
});

export const { list, getOne, create, update, destroy, toggleActive, reorder } = controller;
