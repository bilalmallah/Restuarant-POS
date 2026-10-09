import createError from "http-errors";
import { Op } from "sequelize";
import Employee from "./employeeModel.js";
import Order from "../orders/orderModel.js";
import EmployeeLedger from "../payroll/employeeLedgerModel.js";
import { crudController } from "../../utils/crudFactory.js";
import { asyncHandler, toMoney, dayRangeWhere } from "../../utils/helperFunctions.js";
import { balancesByEmployee, summariseLedger, withRunningBalance } from "../../services/payrollService.js";

const controller = crudController({
  model: Employee,
  label: "Employee",
  searchFields: ["name", "phone", "cnic"],
  defaultOrder: [["name", "ASC"]],
  beforeDestroy: async (employee) => {
    const orderCount = await Order.count({ where: { waiterId: employee.id } });
    if (orderCount) {
      throw createError(
        409,
        `${employee.name} is on ${orderCount} order${orderCount === 1 ? "" : "s"}. Deactivate instead of deleting so the sales history stays intact.`
      );
    }
  },
});

/** The staff list, each row carrying what is still owed to that person. */
export const listWithBalances = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.isActive === "true" || req.query.isActive === "false")
    where.isActive = req.query.isActive === "true";
  if (req.query.role) where.role = req.query.role;
  if (req.query.search) where.name = { [Op.iLike]: `%${req.query.search}%` };

  const employees = await Employee.findAll({ where, order: [["name", "ASC"]] });
  const balances = await balancesByEmployee();

  res.status(200).json(
    employees.map((employee) => ({
      ...employee.toJSON(),
      monthlySalary: Number(employee.monthlySalary),
      dailyWage: Number(employee.dailyWage),
      commissionPercent: Number(employee.commissionPercent),
      pending: balances.get(employee.id)?.pending ?? 0,
      lastEntryDate: balances.get(employee.id)?.lastEntryDate ?? null,
    }))
  );
});

/** Only waiters, for the picker that opens before any order can be started. */
export const listWaiters = asyncHandler(async (_req, res) => {
  const waiters = await Employee.findAll({
    where: { isActive: true, isWaiter: true },
    attributes: ["id", "name", "role", "commissionPercent"],
    order: [["name", "ASC"]],
  });

  res.status(200).json(waiters);
});

/**
 * One employee's full picture: pay structure, ledger with a running balance,
 * and what they sold. This is the page that gets printed and handed over on
 * salary day, so it has to answer every question in one sheet.
 */
export const getEmployeeStatement = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) return next(createError(404, "Employee not found"));

  const { from, to } = req.query;

  const entries = await EmployeeLedger.findAll({
    where: { employeeId: employee.id, ...dayRangeWhere("entryDate", from, to) },
    order: [["entryDate", "ASC"], ["id", "ASC"]],
  });

  // The running balance has to start from every entry ever made, not just the
  // filtered window, or a one-month statement would open at zero and mislead.
  const allEntries = from || to
    ? await EmployeeLedger.findAll({
        where: { employeeId: employee.id },
        order: [["entryDate", "ASC"], ["id", "ASC"]],
      })
    : entries;

  const summary = summariseLedger(allEntries);
  const balanceById = new Map(
    withRunningBalance(allEntries).map((entry) => [entry.id, entry.runningBalance])
  );

  const sales = await Order.findAll({
    where: {
      waiterId: employee.id,
      status: { [Op.in]: ["paid", "credit"] },
      ...dayRangeWhere("openedAt", from, to),
    },
    attributes: ["id", "orderNumber", "businessDate", "total", "commissionAmount"],
    order: [["openedAt", "DESC"]],
    limit: 200,
  });

  res.status(200).json({
    employee: {
      ...employee.toJSON(),
      monthlySalary: Number(employee.monthlySalary),
      dailyWage: Number(employee.dailyWage),
      commissionPercent: Number(employee.commissionPercent),
    },
    summary,
    entries: entries.map((entry) => ({
      ...entry.toJSON(),
      amount: Number(entry.amount),
      runningBalance: balanceById.get(entry.id) ?? 0,
    })),
    sales: {
      orderCount: sales.length,
      totalSales: toMoney(sales.reduce((sum, order) => sum + Number(order.total), 0)),
      totalCommission: toMoney(sales.reduce((sum, order) => sum + Number(order.commissionAmount), 0)),
      orders: sales,
    },
  });
});

export const { list, getOne, create, update, destroy, toggleActive, reorder } = controller;
