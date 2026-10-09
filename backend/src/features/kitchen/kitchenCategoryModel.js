import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

/**
 * Store-room categories (Meat, Vegetables, Spices...). Deliberately separate
 * from menu categories: "Dairy" is something you buy, not something you sell.
 */
const KitchenCategory = sequelize.define(
  "KitchenCategory",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: "A kitchen category with this name already exists" },
    },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "kitchen_categories", timestamps: true }
);

export default KitchenCategory;
