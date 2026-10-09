import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

const Product = sequelize.define(
  "Product",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    /** What is in it, in the menu's own words - staff get asked this constantly. */
    description: { type: DataTypes.TEXT, allowNull: true },

    /**
     * "Small" / "Medium" / "Large" for the sized pizzas, null for everything
     * else.
     *
     * It is a field rather than part of the name because the size has to travel
     * onto the kitchen token and the bill. Leaving it implied by the category
     * meant the cook got a line reading "AFGHANI PIZZA" with no idea which size
     * to make.
     */
    variantLabel: { type: DataTypes.STRING, allowNull: true },
    code: { type: DataTypes.STRING, allowNull: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    /** Cold drinks and other bought-in items should not print on a kitchen token. */
    printToKitchen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    /** Waiter commission is usually a flat house rate, but some items override it. */
    commissionPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "products",
    timestamps: true,
    indexes: [{ unique: true, fields: ["categoryId", "name"], name: "products_category_name_unique" }],
  }
);

export default Product;
