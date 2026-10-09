import createError from "http-errors";
import { Op } from "sequelize";
import CreditPerson from "./creditPersonModel.js";
import CreditAccount from "./creditAccountModel.js";
import CreditTransaction from "./creditTransactionModel.js";
import Order from "../orders/orderModel.js";
import { asyncHandler, toMoney, dayRangeWhere, toDateOnly } from "../../utils/helperFunctions.js";
import { balancesByPerson, balancesByAccount, withRunningBalance } from "../../services/creditService.js";

/* ------------------------------------------------------------------ */
/* PEOPLE                                                              */
/* ------------------------------------------------------------------ */

/** The khata list: every person with what they owe right now. */
export const listPersons = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${req.query.search}%` } },
      { phone: { [Op.iLike]: `%${req.query.search}%` } },
      { company: { [Op.iLike]: `%${req.query.search}%` } },
    ];
  }
  if (req.query.isActive === "true" || req.query.isActive === "false")
    where.isActive = req.query.isActive === "true";

  const persons = await CreditPerson.findAll({
    where,
    include: [{ model: CreditAccount, as: "accounts", attributes: ["id", "name", "isActive"] }],
    order: [["name", "ASC"]],
  });

  const balances = await balancesByPerson();

  const rows = persons.map((person) => ({
    ...person.toJSON(),
    creditLimit: Number(person.creditLimit),
    balance: balances.get(person.id)?.balance ?? 0,
    lastEntryDate: balances.get(person.id)?.lastEntryDate ?? null,
  }));

  res.status(200).json({
    rows,
    totals: {
      people: rows.length,
      outstanding: toMoney(rows.reduce((sum, row) => sum + Math.max(row.balance, 0), 0)),
      advance: toMoney(rows.reduce((sum, row) => sum + Math.min(row.balance, 0), 0)),
    },
  });
});

/**
 * Every person gets a "General" account on creation. Without it the till would
 * have to ask the cashier to invent an account name mid-service, which is
 * exactly the friction the credit flow is meant to avoid.
 */
export const createPerson = asyncHandler(async (req, res) => {
  const { openingBalance, ...personFields } = req.body;

  const person = await CreditPerson.sequelize.transaction(async (transaction) => {
    const created = await CreditPerson.create(personFields, { transaction });

    await CreditAccount.create(
      { creditPersonId: created.id, name: "General", openingBalance: toMoney(openingBalance) },
      { transaction }
    );

    return created;
  });

  const fresh = await CreditPerson.findByPk(person.id, {
    include: [{ model: CreditAccount, as: "accounts" }],
  });

  res.status(201).json({ message: `${person.name} added to the credit book`, data: fresh });
});

export const updatePerson = asyncHandler(async (req, res, next) => {
  const person = await CreditPerson.findByPk(req.params.id);
  if (!person) return next(createError(404, "Credit person not found"));

  const { openingBalance, ...personFields } = req.body;
  await person.update(personFields);

  res.status(200).json({ message: "Saved", data: person });
});

export const deletePerson = asyncHandler(async (req, res, next) => {
  const person = await CreditPerson.findByPk(req.params.id);
  if (!person) return next(createError(404, "Credit person not found"));

  const count = await CreditTransaction.count({ where: { creditPersonId: person.id } });
  if (count) {
    return next(
      createError(
        409,
        `${person.name} has ${count} entries in the book. Deactivate instead of deleting so the history stays.`
      )
    );
  }

  await person.destroy();
  res.status(200).json({ message: "Removed from the credit book" });
});

/**
 * One person's full statement - the page that gets printed and shown to the
 * customer when they come to settle.
 */
export const getPersonStatement = asyncHandler(async (req, res, next) => {
  const person = await CreditPerson.findByPk(req.params.id, {
    include: [{ model: CreditAccount, as: "accounts", order: [["name", "ASC"]] }],
  });
  if (!person) return next(createError(404, "Credit person not found"));

  const { from, to, accountId } = req.query;

  const scope = { creditPersonId: person.id, ...(accountId && { creditAccountId: accountId }) };

  const allRows = await CreditTransaction.findAll({
    where: scope,
    include: [
      { model: CreditAccount, as: "account", attributes: ["id", "name"] },
      { model: Order, as: "order", attributes: ["id", "orderNumber", "businessDate"] },
    ],
    order: [["entryDate", "ASC"], ["id", "ASC"]],
  });

  const accountBalances = await balancesByAccount(person.id);

  const opening = toMoney(
    person.accounts
      .filter((account) => !accountId || account.id === Number(accountId))
      .reduce((sum, account) => sum + Number(account.openingBalance), 0)
  );

  const withBalance = withRunningBalance(allRows, opening);

  // Filter after computing the running balance, so a date-limited statement
  // still opens at the true carried-forward figure.
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTime = to ? new Date(`${to}T23:59:59`).getTime() : null;

  const inWindow = withBalance.filter((row) => {
    const time = new Date(row.entryDate).getTime();
    if (fromTime !== null && time < fromTime) return false;
    if (toTime !== null && time > toTime) return false;
    return true;
  });

  const firstInWindow = withBalance.indexOf(inWindow[0]);
  const openingBalance =
    inWindow.length === 0
      ? withBalance.at(-1)?.runningBalance ?? opening
      : firstInWindow <= 0
        ? opening
        : withBalance[firstInWindow - 1].runningBalance;

  const totalCredit = toMoney(
    inWindow.filter((row) => row.type !== "payment").reduce((sum, row) => sum + row.amount, 0)
  );
  const totalPaid = toMoney(
    inWindow.filter((row) => row.type === "payment").reduce((sum, row) => sum + row.amount, 0)
  );

  res.status(200).json({
    person: { ...person.toJSON(), creditLimit: Number(person.creditLimit) },
    accounts: person.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      isActive: account.isActive,
      openingBalance: Number(account.openingBalance),
      balance: toMoney(Number(account.openingBalance) + (accountBalances.get(account.id) ?? 0)),
    })),
    summary: {
      openingBalance,
      totalCredit,
      totalPaid,
      closingBalance: inWindow.at(-1)?.runningBalance ?? openingBalance,
    },
    entries: inWindow,
  });
});

/* ------------------------------------------------------------------ */
/* ACCOUNTS                                                            */
/* ------------------------------------------------------------------ */

export const listAccounts = asyncHandler(async (req, res) => {
  const accounts = await CreditAccount.findAll({
    where: { creditPersonId: req.params.id },
    order: [["name", "ASC"]],
  });

  const balances = await balancesByAccount(req.params.id);

  res.status(200).json(
    accounts.map((account) => ({
      ...account.toJSON(),
      openingBalance: Number(account.openingBalance),
      balance: toMoney(Number(account.openingBalance) + (balances.get(account.id) ?? 0)),
    }))
  );
});

export const createAccount = asyncHandler(async (req, res, next) => {
  const person = await CreditPerson.findByPk(req.params.id);
  if (!person) return next(createError(404, "Credit person not found"));

  const account = await CreditAccount.create({ ...req.body, creditPersonId: person.id });
  res.status(201).json({ message: "Account added", data: account });
});

export const updateAccount = asyncHandler(async (req, res, next) => {
  const account = await CreditAccount.findByPk(req.params.accountId);
  if (!account) return next(createError(404, "Account not found"));

  await account.update(req.body);
  res.status(200).json({ message: "Account updated", data: account });
});

export const deleteAccount = asyncHandler(async (req, res, next) => {
  const account = await CreditAccount.findByPk(req.params.accountId);
  if (!account) return next(createError(404, "Account not found"));

  const count = await CreditTransaction.count({ where: { creditAccountId: account.id } });
  if (count) return next(createError(409, "This account already has entries and cannot be deleted"));

  await account.destroy();
  res.status(200).json({ message: "Account deleted" });
});

/* ------------------------------------------------------------------ */
/* TRANSACTIONS                                                        */
/* ------------------------------------------------------------------ */

/**
 * Manual entries: a payment received against the book, or credit given outside
 * the POS. Part payments need no special handling - a payment of 3500 against a
 * 5000 balance simply leaves 1500 as the running balance.
 */
export const createTransaction = asyncHandler(async (req, res, next) => {
  const person = await CreditPerson.findByPk(req.params.id);
  if (!person) return next(createError(404, "Credit person not found"));

  const account = await CreditAccount.findOne({
    where: { id: req.body.creditAccountId, creditPersonId: person.id },
  });
  if (!account) return next(createError(404, "That account does not belong to this person"));

  const entry = await CreditTransaction.create({
    ...req.body,
    creditPersonId: person.id,
    amount: toMoney(req.body.amount),
    entryDate: toDateOnly(req.body.entryDate),
    createdById: req.user.id,
  });

  const balances = await balancesByPerson();

  res.status(201).json({
    message: req.body.type === "payment" ? "Payment recorded" : "Credit recorded",
    data: entry,
    balance: balances.get(person.id)?.balance ?? 0,
  });
});

export const updateTransaction = asyncHandler(async (req, res, next) => {
  const entry = await CreditTransaction.findByPk(req.params.transactionId);
  if (!entry) return next(createError(404, "Entry not found"));

  // Entries created by settling a bill must stay tied to that bill's amount.
  if (entry.orderId)
    return next(createError(409, "This entry came from a bill. Cancel the bill to change it."));

  await entry.update({
    ...req.body,
    ...(req.body.amount !== undefined && { amount: toMoney(req.body.amount) }),
    ...(req.body.entryDate && { entryDate: toDateOnly(req.body.entryDate) }),
  });

  res.status(200).json({ message: "Entry updated", data: entry });
});

export const deleteTransaction = asyncHandler(async (req, res, next) => {
  const entry = await CreditTransaction.findByPk(req.params.transactionId);
  if (!entry) return next(createError(404, "Entry not found"));

  if (entry.orderId)
    return next(createError(409, "This entry came from a bill. Cancel the bill instead."));

  await entry.destroy();
  res.status(200).json({ message: "Entry deleted" });
});

/** Every movement across every khata, for the credit report. */
export const listAllTransactions = asyncHandler(async (req, res) => {
  const { from, to, type, creditPersonId } = req.query;

  const entries = await CreditTransaction.findAll({
    where: {
      ...dayRangeWhere("entryDate", from, to),
      ...(type && { type }),
      ...(creditPersonId && { creditPersonId }),
    },
    include: [
      { model: CreditPerson, as: "person", attributes: ["id", "name", "phone"] },
      { model: CreditAccount, as: "account", attributes: ["id", "name"] },
      { model: Order, as: "order", attributes: ["id", "orderNumber"] },
    ],
    order: [["entryDate", "DESC"], ["id", "DESC"]],
  });

  const rows = entries.map((entry) => ({ ...entry.toJSON(), amount: Number(entry.amount) }));

  res.status(200).json({
    rows,
    totals: {
      given: toMoney(rows.filter((row) => row.type !== "payment").reduce((s, r) => s + r.amount, 0)),
      received: toMoney(rows.filter((row) => row.type === "payment").reduce((s, r) => s + r.amount, 0)),
    },
  });
});
