import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

export const CLOSING_STATUSES = ["draft", "completed"];

/**
 * The end-of-night walk through the store room. One sheet per business date:
 * staff mark what is available, what ran out and how much to buy tomorrow,
 * then the completed sheet prints as the morning shopping list.
 */
const Closing = sequelize.define(
  "Closing",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    businessDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: { msg: "A closing sheet already exists for this date" },
    },
    status: { type: DataTypes.ENUM(...CLOSING_STATUSES), allowNull: false, defaultValue: "draft" },
    checkedById: { type: DataTypes.INTEGER, allowNull: true },
    checkedByName: { type: DataTypes.STRING, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "closings", timestamps: true }
);

export default Closing;
