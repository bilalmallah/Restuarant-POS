import createError from "http-errors";
import Category from "./categoryModel.js";
import Product from "../products/productModel.js";
import { crudController } from "../../utils/crudFactory.js";

const controller = crudController({
  model: Category,
  label: "Category",
  searchFields: ["name"],
  beforeDestroy: async (category) => {
    const count = await Product.count({ where: { categoryId: category.id } });
    if (count) {
      throw createError(
        409,
        `${category.name} still has ${count} product${count === 1 ? "" : "s"}. Move or delete them first.`
      );
    }
  },
});

export const { list, getOne, create, update, destroy, toggleActive, reorder } = controller;
