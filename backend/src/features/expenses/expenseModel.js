import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

export const EXPENSE_CATEGORIES = [
  "Kitchen Purchase",
  "Vegetables",
  "Meat",
  "Utilities",
  "Rent",
  "Salary",
  "Maintenance",
  "Transport",
  "Marketing",
  "Other",
];

const Expense = sequelize.define(
  "Expense",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    entryDate: { type: DataTypes.DATEONLY, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false, defaultValue: "Other" },
    title: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    paidTo: { type: DataTypes.STRING, allowNull: true },
    paymentMethod: { type: DataTypes.STRING, allowNull: false, defaultValue: "cash" },
    billNumber: { type: DataTypes.STRING, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    createdById: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: "expenses", timestamps: true, indexes: [{ fields: ["entryDate"] }] }
);

export default Expense;
