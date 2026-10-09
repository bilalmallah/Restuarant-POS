import { Op, fn, col, literal } from "sequelize";
import EmployeeLedger, { CREDIT_TYPES } from "../features/payroll/employeeLedgerModel.js";
import { toMoney } from "../utils/helperFunctions.js";

/**
 * The balance every payroll screen is really asking about:
 *
 *     pending = everything earned  -  everything already handed over
 *
 * A positive number means the restaurant still owes the employee; a negative
 * one means they are carrying an advance that has not been worked off yet.
 */
export const summariseLedger = (rows) => {
  const totals = { salary: 0, wage: 0, commission: 0, bonus: 0, advance: 0, payment: 0, deduction: 0 };

  for (const row of rows) {
    totals[row.type] = toMoney(totals[row.type] + Number(row.amount || 0));
  }

  const earned = toMoney(totals.salary + totals.wage + totals.commission + totals.bonus);
  const settled = toMoney(totals.payment + totals.deduction);

  return {
    ...totals,
    earned,
    settled,
    /** Advances are money already in the employee's pocket, so they reduce what is pending. */
    pending: toMoney(earned - settled - totals.advance),
  };
};

/** Same maths as summariseLedger, done in the database for the staff list page. */
export const balancesByEmployee = async (where = {}) => {
  const signedSum = literal(
    `SUM(CASE WHEN "type" IN (${CREDIT_TYPES.map((type) => `'${type}'`).join(", ")}) THEN "amount" ELSE -"amount" END)`
  );

  const rows = await EmployeeLedger.findAll({
    where,
    attributes: [
      "employeeId",
      [signedSum, "pending"],
      [fn("MAX", col("entryDate")), "lastEntryDate"],
    ],
    group: ["employeeId"],
    raw: true,
  });

  return new Map(
    rows.map((row) => [
      row.employeeId,
      { pending: toMoney(row.pending), lastEntryDate: row.lastEntryDate },
    ])
  );
};

/**
 * Walks the ledger oldest-first so every row can show the balance as it stood
 * that day - which is what makes a printed statement believable to the person
 * being paid.
 */
export const withRunningBalance = (rows) => {
  let balance = 0;

  return rows.map((row) => {
    const signed = (CREDIT_TYPES.includes(row.type) ? 1 : -1) * Number(row.amount || 0);
    balance = toMoney(balance + signed);

    return {
      ...(row.toJSON ? row.toJSON() : row),
      amount: Number(row.amount),
      signedAmount: toMoney(signed),
      runningBalance: balance,
    };
  });
};

/** Guards against posting the same month's salary twice. */
export const salaryAlreadyPosted = async (employeeId, periodMonth) =>
  Boolean(
    await EmployeeLedger.findOne({
      where: { employeeId, periodMonth, type: { [Op.in]: ["salary", "wage"] } },
    })
  );
