import { sequelize } from "../src/config/connectDb.js";
import { modelsInDependencyOrder } from "../src/config/associations.js";

/**
 * `--force` drops and rebuilds everything, which is what you want on a fresh
 * install or a demo reset. Without it the tables are only altered, so running
 * this against a live restaurant keeps the data.
 */
const force = process.argv.includes("--force");

if (force) {
  console.log("Rebuilding all tables from scratch (--force)");
  await sequelize.sync({ force: true });
} else {
  for (const model of modelsInDependencyOrder) {
    await model.sync({ alter: true });
  }
}

console.log("Tables ready");

export { modelsInDependencyOrder };
