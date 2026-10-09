import { fn, col, literal } from "sequelize";
import CreditTransaction from "../features/credit/creditTransactionModel.js";
import CreditAccount from "../features/credit/creditAccountModel.js";
import { toMoney } from "../utils/helperFunctions.js";

/**
 * A khata balance is always:
 *
 *     opening balance  +  everything taken on credit  -  everything paid back
 *
 * Opening balances live on the account (not the person) so a customer who keeps
 * a company book and a personal book starts each one where its paper
 * predecessor left off.
 */
const signedSum = literal(
  `SUM(CASE WHEN "type" = 'payment' THEN -"amount" ELSE "amount" END)`
);

export const balancesByPerson = async () => {
  const [movements, openings] = await Promise.all([
    CreditTransaction.findAll({
      attributes: [
        "creditPersonId",
        [signedSum, "movement"],
        [fn("MAX", col("entryDate")), "lastEntryDate"],
      ],
      group: ["creditPersonId"],
      raw: true,
    }),
    CreditAccount.findAll({
      attributes: ["creditPersonId", [fn("SUM", col("openingBalance")), "opening"]],
      group: ["creditPersonId"],
      raw: true,
    }),
  ]);

  const result = new Map();

  for (const row of openings) {
    result.set(row.creditPersonId, { balance: toMoney(row.opening), lastEntryDate: null });
  }

  for (const row of movements) {
    const current = result.get(row.creditPersonId) ?? { balance: 0, lastEntryDate: null };
    result.set(row.creditPersonId, {
      balance: toMoney(current.balance + Number(row.movement || 0)),
      lastEntryDate: row.lastEntryDate,
    });
  }

  return result;
};

export const balancesByAccount = async (creditPersonId) => {
  const movements = await CreditTransaction.findAll({
    where: { creditPersonId },
    attributes: ["creditAccountId", [signedSum, "movement"]],
    group: ["creditAccountId"],
    raw: true,
  });

  return new Map(movements.map((row) => [row.creditAccountId, toMoney(row.movement)]));
};

/**
 * Statement rows, oldest first, each showing the balance as it stood that day.
 * `opening` seeds it so the first row is not misleadingly small.
 */
export const withRunningBalance = (rows, opening = 0) => {
  let balance = toMoney(opening);

  return rows.map((row) => {
    const signed = (row.type === "payment" ? -1 : 1) * Number(row.amount || 0);
    balance = toMoney(balance + signed);

    return {
      ...(row.toJSON ? row.toJSON() : row),
      amount: Number(row.amount),
      signedAmount: toMoney(signed),
      runningBalance: balance,
    };
  });
};
