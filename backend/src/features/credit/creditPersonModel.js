import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

/**
 * The khata (credit book). Only people recorded here may have a bill moved to
 * credit - that is the whole point of the dropdown at the till: a waiter cannot
 * invent a new debtor in the middle of service.
 */
const CreditPerson = sequelize.define(
  "CreditPerson",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    company: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    creditLimit: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "credit_persons", timestamps: true }
);

export default CreditPerson;
