import createError from "http-errors";
import { Op } from "sequelize";
import Expense, { EXPENSE_CATEGORIES } from "./expenseModel.js";
import User from "../users/userModel.js";
import { asyncHandler, toMoney, dayRangeWhere, toDateOnly } from "../../utils/helperFunctions.js";

export const listExpenses = asyncHandler(async (req, res) => {
  const { from, to, category, search } = req.query;

  const expenses = await Expense.findAll({
    where: {
      ...dayRangeWhere("entryDate", from, to),
      ...(category && { category }),
      ...(search && {
        [Op.or]: [
          { title: { [Op.iLike]: `%${search}%` } },
          { paidTo: { [Op.iLike]: `%${search}%` } },
          { billNumber: { [Op.iLike]: `%${search}%` } },
        ],
      }),
    },
    include: [{ model: User, as: "createdBy", attributes: ["id", "name"] }],
    order: [["entryDate", "DESC"], ["id", "DESC"]],
  });

  const rows = expenses.map((expense) => ({ ...expense.toJSON(), amount: Number(expense.amount) }));

  // The by-category split drives the donut on the expenses page, so it is
  // computed here rather than in the browser where the list may be paginated.
  const byCategory = new Map();
  for (const row of rows) {
    byCategory.set(row.category, toMoney((byCategory.get(row.category) ?? 0) + row.amount));
  }

  res.status(200).json({
    rows,
    totals: {
      count: rows.length,
      amount: toMoney(rows.reduce((sum, row) => sum + row.amount, 0)),
    },
    byCategory: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  });
});

export const getExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findByPk(req.params.id);
  if (!expense) return next(createError(404, "Expense not found"));
  res.status(200).json(expense);
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    ...req.body,
    entryDate: toDateOnly(req.body.entryDate),
    amount: toMoney(req.body.amount),
    createdById: req.user.id,
  });

  res.status(201).json({ message: "Expense saved", data: expense });
});

export const updateExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findByPk(req.params.id);
  if (!expense) return next(createError(404, "Expense not found"));

  await expense.update({
    ...req.body,
    ...(req.body.entryDate && { entryDate: toDateOnly(req.body.entryDate) }),
    ...(req.body.amount !== undefined && { amount: toMoney(req.body.amount) }),
  });

  res.status(200).json({ message: "Expense updated", data: expense });
});

export const deleteExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findByPk(req.params.id);
  if (!expense) return next(createError(404, "Expense not found"));

  await expense.destroy();
  res.status(200).json({ message: "Expense deleted" });
});

/** Built-in categories plus anything the restaurant has typed in itself. */
export const listCategories = asyncHandler(async (_req, res) => {
  const used = await Expense.findAll({
    attributes: [[Expense.sequelize.fn("DISTINCT", Expense.sequelize.col("category")), "category"]],
    raw: true,
  });

  const merged = [...new Set([...EXPENSE_CATEGORIES, ...used.map((row) => row.category)])];
  res.status(200).json(merged.filter(Boolean).sort());
});
