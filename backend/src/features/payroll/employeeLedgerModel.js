import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

/**
 * One running account per employee. Everything the restaurant owes the staff
 * member is a CREDIT (+), everything already handed over is a DEBIT (-), so the
 * balance answers the only question that matters on salary day:
 * how much is still pending for this person.
 *
 *   salary      +  monthly salary posted for a month
 *   wage        +  one day of wage for a daily-rate worker
 *   commission  +  commission earned (daily total or a manual entry)
 *   bonus       +  eid money, tips shared by the house, etc.
 *   advance     -  emergency cash taken mid-month, recovered from salary later
 *   payment     -  salary or commission actually paid out
 *   deduction   -  fines, breakages, unpaid leave
 */
export const LEDGER_TYPES = ["salary", "wage", "commission", "bonus", "advance", "payment", "deduction"];
export const CREDIT_TYPES = ["salary", "wage", "commission", "bonus"];

const EmployeeLedger = sequelize.define(
  "EmployeeLedger",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.ENUM(...LEDGER_TYPES), allowNull: false },
    /** Always stored positive; the type decides which side of the ledger it falls on. */
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    entryDate: { type: DataTypes.DATEONLY, allowNull: false },
    /** "2026-09" on salary rows, so a month can never be posted twice by accident. */
    periodMonth: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
    createdById: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "employee_ledger",
    timestamps: true,
    indexes: [{ fields: ["employeeId", "entryDate"] }],
  }
);

export const isCreditEntry = (type) => CREDIT_TYPES.includes(type);

/** Signed value: what this row does to the amount the restaurant still owes. */
export const ledgerSignedAmount = (row) =>
  (isCreditEntry(row.type) ? 1 : -1) * Number(row.amount || 0);

export default EmployeeLedger;
