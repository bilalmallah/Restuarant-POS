import createError from "http-errors";
import KitchenCategory from "./kitchenCategoryModel.js";
import KitchenItem from "./kitchenItemModel.js";
import { crudController } from "../../utils/crudFactory.js";
import { asyncHandler } from "../../utils/helperFunctions.js";

const itemInclude = [
  { model: KitchenCategory, as: "kitchenCategory", attributes: ["id", "name"] },
];

export const categories = crudController({
  model: KitchenCategory,
  label: "Kitchen category",
  searchFields: ["name"],
  beforeDestroy: async (category) => {
    const count = await KitchenItem.count({ where: { kitchenCategoryId: category.id } });
    if (count) {
      throw createError(
        409,
        `${category.name} still has ${count} item${count === 1 ? "" : "s"}. Move or delete them first.`
      );
    }
  },
});

export const items = crudController({
  model: KitchenItem,
  label: "Kitchen item",
  searchFields: ["name", "supplier"],
  include: itemInclude,
  defaultOrder: [["sortOrder", "ASC"], ["name", "ASC"]],
});

/**
 * The whole store list grouped by category - what the Kitchen Items screen and
 * the closing sheet both start from, so they can never drift out of step.
 */
export const getItemsGrouped = asyncHandler(async (_req, res) => {
  const groups = await KitchenCategory.findAll({
    where: { isActive: true },
    order: [["sortOrder", "ASC"], ["name", "ASC"]],
    include: [
      {
        model: KitchenItem,
        as: "items",
        where: { isActive: true },
        required: false,
        separate: true,
        order: [["sortOrder", "ASC"], ["name", "ASC"]],
      },
    ],
  });

  res.status(200).json(
    groups.map((group) => ({
      id: group.id,
      name: group.name,
      items: group.items.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        minQuantity: Number(item.minQuantity),
        defaultOrderQuantity: Number(item.defaultOrderQuantity),
        supplier: item.supplier,
        kitchenCategoryId: item.kitchenCategoryId,
        categoryName: group.name,
      })),
    }))
  );
});
