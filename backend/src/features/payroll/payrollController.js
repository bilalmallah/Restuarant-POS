import createError from "http-errors";
import { Op } from "sequelize";
import EmployeeLedger from "./employeeLedgerModel.js";
import Employee from "../employees/employeeModel.js";
import Order from "../orders/orderModel.js";
import { asyncHandler, toMoney, dayRangeWhere, toDateOnly } from "../../utils/helperFunctions.js";
import { summariseLedger, salaryAlreadyPosted, balancesByEmployee } from "../../services/payrollService.js";

const employeeInclude = [
  { model: Employee, as: "employee", attributes: ["id", "name", "role", "payType"] },
];

/* ------------------------------------------------------------------ */
/* LEDGER ENTRIES                                                      */
/* ------------------------------------------------------------------ */

export const listEntries = asyncHandler(async (req, res) => {
  const { employeeId, type, from, to } = req.query;

  const entries = await EmployeeLedger.findAll({
    where: {
      ...(employeeId && { employeeId }),
      ...(type && { type: { [Op.in]: String(type).split(",") } }),
      ...dayRangeWhere("entryDate", from, to),
    },
    include: employeeInclude,
    order: [["entryDate", "DESC"], ["id", "DESC"]],
  });

  res.status(200).json(
    entries.map((entry) => ({ ...entry.toJSON(), amount: Number(entry.amount) }))
  );
});

export const createEntry = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.body.employeeId);
  if (!employee) return next(createError(404, "Employee not found"));

  const entry = await EmployeeLedger.create({
    ...req.body,
    entryDate: toDateOnly(req.body.entryDate),
    createdById: req.user.id,
  });

  res.status(201).json({ message: "Entry saved", data: entry });
});

export const updateEntry = asyncHandler(async (req, res, next) => {
  const entry = await EmployeeLedger.findByPk(req.params.id);
  if (!entry) return next(createError(404, "Entry not found"));

  await entry.update({
    ...req.body,
    ...(req.body.entryDate && { entryDate: toDateOnly(req.body.entryDate) }),
  });

  res.status(200).json({ message: "Entry updated", data: entry });
});

export const deleteEntry = asyncHandler(async (req, res, next) => {
  const entry = await EmployeeLedger.findByPk(req.params.id);
  if (!entry) return next(createError(404, "Entry not found"));

  await entry.destroy();
  res.status(200).json({ message: "Entry deleted" });
});

/* ------------------------------------------------------------------ */
/* SHORTCUTS FOR THE COMMON ENTRIES                                    */
/* ------------------------------------------------------------------ */

/** Emergency cash mid-month. Recovered automatically because it lowers `pending`. */
export const recordAdvance = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.body.employeeId);
  if (!employee) return next(createError(404, "Employee not found"));

  const entry = await EmployeeLedger.create({
    employeeId: employee.id,
    type: "advance",
    amount: toMoney(req.body.amount),
    entryDate: toDateOnly(req.body.entryDate),
    description: req.body.description || "Advance taken",
    createdById: req.user.id,
  });

  res.status(201).json({ message: `Advance recorded for ${employee.name}`, data: entry });
});

export const recordPayment = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.body.employeeId);
  if (!employee) return next(createError(404, "Employee not found"));

  const entry = await EmployeeLedger.create({
    employeeId: employee.id,
    type: "payment",
    amount: toMoney(req.body.amount),
    entryDate: toDateOnly(req.body.entryDate),
    description: req.body.description || "Paid out",
    createdById: req.user.id,
  });

  const rows = await EmployeeLedger.findAll({ where: { employeeId: employee.id } });

  res.status(201).json({
    message: `Payment recorded for ${employee.name}`,
    data: entry,
    pending: summariseLedger(rows).pending,
  });
});

/**
 * Posts one month's salary (or a day's wage for daily staff) to the ledger.
 * Until it is posted, nothing is owed - which is why an employee who joined
 * mid-month does not silently accrue a full salary.
 */
export const postSalaries = asyncHandler(async (req, res) => {
  const { employeeIds, periodMonth, entryDate } = req.body;

  const employees = await Employee.findAll({
    where: {
      isActive: true,
      payType: { [Op.in]: ["monthly", "daily"] },
      ...(employeeIds?.length && { id: { [Op.in]: employeeIds } }),
    },
  });

  const postedOn = toDateOnly(entryDate || `${periodMonth}-28`);
  const created = [];
  const skipped = [];

  for (const employee of employees) {
    if (await salaryAlreadyPosted(employee.id, periodMonth)) {
      skipped.push({ id: employee.id, name: employee.name, reason: "Already posted for this month" });
      continue;
    }

    const isMonthly = employee.payType === "monthly";
    const amount = toMoney(isMonthly ? employee.monthlySalary : employee.dailyWage);

    if (amount <= 0) {
      skipped.push({ id: employee.id, name: employee.name, reason: "No pay rate set" });
      continue;
    }

    const entry = await EmployeeLedger.create({
      employeeId: employee.id,
      type: isMonthly ? "salary" : "wage",
      amount,
      entryDate: postedOn,
      periodMonth,
      description: isMonthly ? `Salary for ${periodMonth}` : `Wage for ${postedOn}`,
      createdById: req.user.id,
    });

    created.push({ id: employee.id, name: employee.name, amount, entryId: entry.id });
  }

  res.status(201).json({
    message: `${created.length} salar${created.length === 1 ? "y" : "ies"} posted`,
    created,
    skipped,
  });
});

/**
 * The daily commission sheet. Waiter commission is posted automatically at
 * settlement, but the house often adds a manual figure at close of night, so
 * this saves a whole column of amounts in one go.
 */
export const saveDailyCommissions = asyncHandler(async (req, res) => {
  const { entryDate, rows } = req.body;
  const postedOn = toDateOnly(entryDate);

  const payable = rows.filter((row) => Number(row.amount) > 0);

  const created = await EmployeeLedger.bulkCreate(
    payable.map((row) => ({
      employeeId: row.employeeId,
      type: "commission",
      amount: toMoney(row.amount),
      entryDate: postedOn,
      description: row.description || `Commission for ${postedOn}`,
      createdById: req.user.id,
    }))
  );

  res.status(201).json({ message: `${created.length} commission entries saved`, data: created });
});

/* ------------------------------------------------------------------ */
/* OVERVIEW                                                            */
/* ------------------------------------------------------------------ */

/**
 * The payroll dashboard: everyone, what they earned in the window, what they
 * were paid, and the single number that matters - what is still pending.
 */
export const getPayrollSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const employees = await Employee.findAll({
    where: { isActive: true },
    order: [["name", "ASC"]],
  });

  const windowEntries = await EmployeeLedger.findAll({
    where: dayRangeWhere("entryDate", from, to),
  });

  const lifetimeBalances = await balancesByEmployee();

  const byEmployee = new Map();
  for (const entry of windowEntries) {
    if (!byEmployee.has(entry.employeeId)) byEmployee.set(entry.employeeId, []);
    byEmployee.get(entry.employeeId).push(entry);
  }

  const rows = employees.map((employee) => {
    const period = summariseLedger(byEmployee.get(employee.id) ?? []);

    return {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      payType: employee.payType,
      monthlySalary: Number(employee.monthlySalary),
      dailyWage: Number(employee.dailyWage),
      commissionPercent: Number(employee.commissionPercent),
      periodEarned: period.earned,
      periodCommission: period.commission,
      periodAdvance: period.advance,
      periodPaid: period.payment,
      /** Lifetime, not windowed - "still owed" is never a per-month question. */
      pending: lifetimeBalances.get(employee.id)?.pending ?? 0,
    };
  });

  res.status(200).json({
    rows,
    totals: {
      earned: toMoney(rows.reduce((sum, row) => sum + row.periodEarned, 0)),
      commission: toMoney(rows.reduce((sum, row) => sum + row.periodCommission, 0)),
      advance: toMoney(rows.reduce((sum, row) => sum + row.periodAdvance, 0)),
      paid: toMoney(rows.reduce((sum, row) => sum + row.periodPaid, 0)),
      pending: toMoney(rows.reduce((sum, row) => sum + row.pending, 0)),
    },
  });
});

/**
 * Commission actually earned from sales in a window, straight off the orders.
 * Useful as a cross-check against what was posted to the ledger.
 */
export const getCommissionFromSales = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const orders = await Order.findAll({
    where: {
      status: { [Op.in]: ["paid", "credit"] },
      waiterId: { [Op.ne]: null },
      ...dayRangeWhere("openedAt", from, to),
    },
    include: [{ model: Employee, as: "waiter", attributes: ["id", "name"] }],
  });

  const byWaiter = new Map();

  for (const order of orders) {
    const key = order.waiterId;
    const current = byWaiter.get(key) ?? {
      employeeId: key,
      name: order.waiter?.name ?? "Unknown",
      orderCount: 0,
      totalSales: 0,
      commission: 0,
    };

    current.orderCount += 1;
    current.totalSales = toMoney(current.totalSales + Number(order.total));
    current.commission = toMoney(current.commission + Number(order.commissionAmount));

    byWaiter.set(key, current);
  }

  const rows = [...byWaiter.values()].sort((a, b) => b.totalSales - a.totalSales);

  res.status(200).json({
    rows,
    totals: {
      orderCount: rows.reduce((sum, row) => sum + row.orderCount, 0),
      totalSales: toMoney(rows.reduce((sum, row) => sum + row.totalSales, 0)),
      commission: toMoney(rows.reduce((sum, row) => sum + row.commission, 0)),
    },
  });
});
