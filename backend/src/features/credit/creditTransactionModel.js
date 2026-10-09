import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

/**
 *   credit   the restaurant gave food on account - the debt goes UP
 *   payment  the customer handed money over - the debt goes DOWN
 *
 * A partial settlement is simply a payment row for what was received; the
 * remainder stays as balance, which is exactly the "5000 billed, 3500 paid,
 * 1500 still pending" flow the counter staff expect.
 */
export const CREDIT_TXN_TYPES = ["credit", "payment", "adjustment"];

const CreditTransaction = sequelize.define(
  "CreditTransaction",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    creditPersonId: { type: DataTypes.INTEGER, allowNull: false },
    creditAccountId: { type: DataTypes.INTEGER, allowNull: false },
    /** Set when the row was created by sending a table bill to credit. */
    orderId: { type: DataTypes.INTEGER, allowNull: true },
    type: { type: DataTypes.ENUM(...CREDIT_TXN_TYPES), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    entryDate: { type: DataTypes.DATEONLY, allowNull: false },
    paymentMethod: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
    createdById: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "credit_transactions",
    timestamps: true,
    indexes: [{ fields: ["creditPersonId", "entryDate"] }],
  }
);

/** Signed value: what this row does to the amount the customer still owes us. */
export const creditSignedAmount = (row) =>
  (row.type === "payment" ? -1 : 1) * Number(row.amount || 0);

export default CreditTransaction;
