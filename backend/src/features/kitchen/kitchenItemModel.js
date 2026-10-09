import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

export const KITCHEN_UNITS = ["kg", "gram", "litre", "ml", "piece", "packet", "dozen", "bundle", "bottle", "tin"];

const KitchenItem = sequelize.define(
  "KitchenItem",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    kitchenCategoryId: { type: DataTypes.INTEGER, allowNull: false },
    unit: { type: DataTypes.ENUM(...KITCHEN_UNITS), allowNull: false, defaultValue: "kg" },
    /** Below this, the closing checklist flags the item as low stock by default. */
    minQuantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    /** Pre-fills tomorrow's demand so closing is a quick confirm, not data entry. */
    defaultOrderQuantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    supplier: { type: DataTypes.STRING, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "kitchen_items",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["kitchenCategoryId", "name"], name: "kitchen_items_category_name_unique" },
    ],
  }
);

export default KitchenItem;
