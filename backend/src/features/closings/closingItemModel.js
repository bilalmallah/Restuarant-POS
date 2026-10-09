import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

export const STOCK_STATUSES = ["available", "low", "out"];

const ClosingItem = sequelize.define(
  "ClosingItem",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    closingId: { type: DataTypes.INTEGER, allowNull: false },
    kitchenItemId: { type: DataTypes.INTEGER, allowNull: true },

    /** Snapshotted so an old sheet still reads correctly after the item is renamed. */
    itemName: { type: DataTypes.STRING, allowNull: false },
    categoryName: { type: DataTypes.STRING, allowNull: true },
    unit: { type: DataTypes.STRING, allowNull: false, defaultValue: "kg" },

    status: { type: DataTypes.ENUM(...STOCK_STATUSES), allowNull: false, defaultValue: "available" },
    /** What is physically left in the store right now. */
    inStockQuantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    /** What must be bought for tomorrow - this is what the shopping list prints. */
    demandQuantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    note: { type: DataTypes.STRING, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { tableName: "closing_items", timestamps: true, indexes: [{ fields: ["closingId"] }] }
);

export default ClosingItem;
