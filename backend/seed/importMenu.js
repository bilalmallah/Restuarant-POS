import { sequelize } from "../src/config/connectDb.js";
import { Category, Product, OrderItem } from "../src/config/associations.js";
import { buildMenu } from "./menuData.js";

/**
 * Replaces the entire menu with what is in menuData.js.
 *
 * This wipes every product and category first, so it is a REPLACE, not a merge -
 * run it whenever the printed menu changes and the database will match it
 * exactly, with nothing stale left behind.
 *
 * Bills already taken are unaffected: every order line keeps its own copy of the
 * name and price it was sold at (see orderItemModel), and the product link is
 * ON DELETE SET NULL, so last month's reports survive a full menu replacement.
 */

// Adds any new columns (description, variantLabel) to an existing install.
await Product.sync({ alter: true });
await OrderItem.sync({ alter: true });

const menu = buildMenu();

const summary = await sequelize.transaction(async (transaction) => {
  const removedProducts = await Product.destroy({ where: {}, transaction });
  const removedCategories = await Category.destroy({ where: {}, transaction });

  let categoryOrder = 0;
  let created = 0;

  for (const group of menu) {
    const category = await Category.create(
      { name: group.category, colour: group.colour, sortOrder: categoryOrder++ },
      { transaction }
    );

    const rows = group.products.map(([name, price, description, options], index) => ({
      name,
      description: description ?? null,
      variantLabel: options?.variant ?? null,
      price,
      categoryId: category.id,
      // Sealed drinks are the only things that skip the kitchen token.
      printToKitchen: options?.kitchen ?? true,
      sortOrder: index,
      isActive: true,
    }));

    await Product.bulkCreate(rows, { transaction });
    created += rows.length;
  }

  return { removedProducts, removedCategories, created, categories: menu.length };
});

console.log(`Removed ${summary.removedProducts} products and ${summary.removedCategories} categories`);
console.log(`Imported ${summary.created} products across ${summary.categories} categories:\n`);

for (const group of menu) {
  console.log(`  ${group.category.padEnd(24)} ${String(group.products.length).padStart(2)} items`);
}

console.log("\nMenu import complete.");
process.exit(0);
