import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

/**
 * A person can keep more than one book with the restaurant - a company account
 * for staff lunches and a personal one, say - and the till asks which account
 * the bill belongs to after picking the person. Every person gets a "General"
 * account automatically so the common case stays a single tap.
 */
const CreditAccount = sequelize.define(
  "CreditAccount",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    creditPersonId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false, defaultValue: "General" },
    /** Balance carried in from the old paper book on day one. */
    openingBalance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "credit_accounts",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["creditPersonId", "name"], name: "credit_accounts_person_name_unique" },
    ],
  }
);

export default CreditAccount;
