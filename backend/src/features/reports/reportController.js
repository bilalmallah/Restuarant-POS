import { Op, fn, col, literal } from "sequelize";
import Order from "../orders/orderModel.js";
import OrderItem from "../orders/orderItemModel.js";
import Employee from "../employees/employeeModel.js";
import Table from "../tables/tableModel.js";
import Expense from "../expenses/expenseModel.js";
import EmployeeLedger from "../payroll/employeeLedgerModel.js";
import CreditTransaction from "../credit/creditTransactionModel.js";
import { asyncHandler, toMoney, dayRangeWhere } from "../../utils/helperFunctions.js";
import { businessDateOf } from "../../services/orderService.js";

/** Bills that count as revenue. An unpaid open table is not a sale yet. */
const SETTLED = { [Op.in]: ["paid", "credit"] };

const rangeFromQuery = (query) => {
  const to = query.to || businessDateOf();
  const from = query.from || to;
  return { from, to };
};

const settledWhere = (from, to, extra = {}) => ({
  status: SETTLED,
  ...dayRangeWhere("businessDate", from, to),
  ...extra,
});

/* ------------------------------------------------------------------ */
/* SALES SUMMARY  (this date to this date, total amount)               */
/* ------------------------------------------------------------------ */

export const getSalesSummary = asyncHandler(async (req, res) => {
  const { from, to } = rangeFromQuery(req.query);
  const { waiterId, orderType } = req.query;

  const orders = await Order.findAll({
    where: settledWhere(from, to, {
      ...(waiterId && { waiterId }),
      ...(orderType && { orderType }),
    }),
    include: [
      { model: Employee, as: "waiter", attributes: ["id", "name"] },
      { model: Table, as: "table", attributes: ["id", "name"] },
    ],
    order: [["businessDate", "ASC"], ["orderNumber", "ASC"]],
  });

  const voided = await Order.count({
    where: { status: "void", ...dayRangeWhere("businessDate", from, to) },
  });

  const totals = orders.reduce(
    (acc, order) => ({
      grossSales: toMoney(acc.grossSales + Number(order.subtotal)),
      discount: toMoney(acc.discount + Number(order.discountAmount)),
      tax: toMoney(acc.tax + Number(order.taxAmount)),
      serviceCharge: toMoney(acc.serviceCharge + Number(order.serviceCharge)),
      deliveryCharge: toMoney(acc.deliveryCharge + Number(order.deliveryCharge)),
      netSales: toMoney(acc.netSales + Number(order.total)),
      received: toMoney(acc.received + Number(order.paidAmount)),
      commission: toMoney(acc.commission + Number(order.commissionAmount)),
      guests: acc.guests + Number(order.guests || 0),
    }),
    {
      grossSales: 0, discount: 0, tax: 0, serviceCharge: 0,
      deliveryCharge: 0, netSales: 0, received: 0, commission: 0, guests: 0,
    }
  );

  // Credit is simply the part of the bill that was not handed over in cash.
  const onCredit = toMoney(totals.netSales - totals.received);

  const byPaymentMethod = new Map();
  const byOrderType = new Map();
  const byDay = new Map();

  for (const order of orders) {
    const method = order.paymentMethod || "cash";
    byPaymentMethod.set(method, toMoney((byPaymentMethod.get(method) ?? 0) + Number(order.total)));

    byOrderType.set(
      order.orderType,
      toMoney((byOrderType.get(order.orderType) ?? 0) + Number(order.total))
    );

    const day = byDay.get(order.businessDate) ?? { date: order.businessDate, orders: 0, sales: 0, discount: 0 };
    day.orders += 1;
    day.sales = toMoney(day.sales + Number(order.total));
    day.discount = toMoney(day.discount + Number(order.discountAmount));
    byDay.set(order.businessDate, day);
  }

  res.status(200).json({
    range: { from, to },
    totals: {
      ...totals,
      onCredit,
      orderCount: orders.length,
      voidedCount: voided,
      averageBill: orders.length ? toMoney(totals.netSales / orders.length) : 0,
      averagePerGuest: totals.guests ? toMoney(totals.netSales / totals.guests) : 0,
    },
    byPaymentMethod: [...byPaymentMethod.entries()].map(([method, amount]) => ({ method, amount })),
    byOrderType: [...byOrderType.entries()].map(([type, amount]) => ({ type, amount })),
    byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      businessDate: order.businessDate,
      openedAt: order.openedAt,
      tableName: order.table?.name ?? null,
      waiterName: order.waiter?.name ?? null,
      orderType: order.orderType,
      status: order.status,
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      total: Number(order.total),
      paidAmount: Number(order.paidAmount),
    })),
  });
});

/* ------------------------------------------------------------------ */
/* PRODUCT SALES  (which product sold, with quantity)                  */
/* ------------------------------------------------------------------ */

/**
 * Quantity and value per product across a date range. Grouped on the snapshotted
 * item name rather than the product id, so a dish that was deleted from the menu
 * still shows up in last month's numbers.
 */
export const getProductSales = asyncHandler(async (req, res) => {
  const { from, to } = rangeFromQuery(req.query);
  const { categoryName, search } = req.query;

  const rows = await OrderItem.findAll({
    attributes: [
      "name",
      "categoryName",
      [fn("SUM", col("OrderItem.quantity")), "quantity"],
      [fn("SUM", literal(`"OrderItem"."quantity" * "OrderItem"."unitPrice"`)), "amount"],
      [fn("COUNT", col("OrderItem.id")), "lineCount"],
      [fn("AVG", col("OrderItem.unitPrice")), "averagePrice"],
    ],
    include: [
      {
        model: Order,
        as: "order",
        attributes: [],
        required: true,
        where: settledWhere(from, to),
      },
    ],
    where: {
      isReturned: false,
      ...(categoryName && { categoryName }),
      ...(search && { name: { [Op.iLike]: `%${search}%` } }),
    },
    group: ["OrderItem.name", "OrderItem.categoryName"],
    order: [[literal(`SUM("OrderItem"."quantity" * "OrderItem"."unitPrice")`), "DESC"]],
    raw: true,
  });

  const products = rows.map((row) => ({
    name: row.name,
    categoryName: row.categoryName || "Uncategorised",
    quantity: toMoney(row.quantity),
    amount: toMoney(row.amount),
    lineCount: Number(row.lineCount),
    averagePrice: toMoney(row.averagePrice),
  }));

  const byCategory = new Map();
  for (const product of products) {
    const current = byCategory.get(product.categoryName) ?? { categoryName: product.categoryName, quantity: 0, amount: 0 };
    current.quantity = toMoney(current.quantity + product.quantity);
    current.amount = toMoney(current.amount + product.amount);
    byCategory.set(product.categoryName, current);
  }

  res.status(200).json({
    range: { from, to },
    totals: {
      productCount: products.length,
      quantity: toMoney(products.reduce((sum, row) => sum + row.quantity, 0)),
      amount: toMoney(products.reduce((sum, row) => sum + row.amount, 0)),
    },
    byCategory: [...byCategory.values()].sort((a, b) => b.amount - a.amount),
    products,
  });
});

/* ------------------------------------------------------------------ */
/* DAY BOOK  (money in, money out, what is left)                       */
/* ------------------------------------------------------------------ */

/**
 * The owner's end-of-period question: what came in, what went out, what is
 * left. Expenses and staff payouts are both real cash leaving the drawer, so
 * both are subtracted; credit given is shown separately because it is revenue
 * that has not arrived yet.
 */
export const getDayBook = asyncHandler(async (req, res) => {
  const { from, to } = rangeFromQuery(req.query);

  const [orders, expenses, payouts, creditMovements] = await Promise.all([
    Order.findAll({ where: settledWhere(from, to) }),
    Expense.findAll({ where: dayRangeWhere("entryDate", from, to) }),
    EmployeeLedger.findAll({
      where: { type: { [Op.in]: ["payment", "advance"] }, ...dayRangeWhere("entryDate", from, to) },
    }),
    CreditTransaction.findAll({ where: dayRangeWhere("entryDate", from, to) }),
  ]);

  const sales = toMoney(orders.reduce((sum, order) => sum + Number(order.total), 0));
  const cashReceived = toMoney(orders.reduce((sum, order) => sum + Number(order.paidAmount), 0));
  const creditGiven = toMoney(
    creditMovements.filter((row) => row.type !== "payment").reduce((sum, row) => sum + Number(row.amount), 0)
  );
  const creditRecovered = toMoney(
    creditMovements.filter((row) => row.type === "payment").reduce((sum, row) => sum + Number(row.amount), 0)
  );
  const expenseTotal = toMoney(expenses.reduce((sum, row) => sum + Number(row.amount), 0));
  const staffPaid = toMoney(payouts.reduce((sum, row) => sum + Number(row.amount), 0));

  const moneyIn = toMoney(cashReceived + creditRecovered);
  const moneyOut = toMoney(expenseTotal + staffPaid);

  const byDay = new Map();
  const bump = (date, key, amount) => {
    const day = byDay.get(date) ?? { date, sales: 0, cashReceived: 0, creditGiven: 0, creditRecovered: 0, expenses: 0, staffPaid: 0 };
    day[key] = toMoney(day[key] + Number(amount));
    byDay.set(date, day);
  };

  for (const order of orders) {
    bump(order.businessDate, "sales", order.total);
    bump(order.businessDate, "cashReceived", order.paidAmount);
  }
  for (const row of creditMovements) {
    bump(row.entryDate, row.type === "payment" ? "creditRecovered" : "creditGiven", row.amount);
  }
  for (const row of expenses) bump(row.entryDate, "expenses", row.amount);
  for (const row of payouts) bump(row.entryDate, "staffPaid", row.amount);

  res.status(200).json({
    range: { from, to },
    totals: {
      orderCount: orders.length,
      sales,
      cashReceived,
      creditGiven,
      creditRecovered,
      expenses: expenseTotal,
      staffPaid,
      moneyIn,
      moneyOut,
      netInHand: toMoney(moneyIn - moneyOut),
      /** Sales minus what it cost to run the place, credit counted as earned. */
      netProfit: toMoney(sales - expenseTotal - staffPaid),
    },
    byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    expensesByCategory: [
      ...expenses
        .reduce((map, row) => {
          map.set(row.category, toMoney((map.get(row.category) ?? 0) + Number(row.amount)));
          return map;
        }, new Map())
        .entries(),
    ]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  });
});

/* ------------------------------------------------------------------ */
/* WAITER PERFORMANCE                                                  */
/* ------------------------------------------------------------------ */

export const getWaiterReport = asyncHandler(async (req, res) => {
  const { from, to } = rangeFromQuery(req.query);

  const orders = await Order.findAll({
    where: settledWhere(from, to, { waiterId: { [Op.ne]: null } }),
    include: [{ model: Employee, as: "waiter", attributes: ["id", "name", "role"] }],
  });

  const byWaiter = new Map();

  for (const order of orders) {
    const current = byWaiter.get(order.waiterId) ?? {
      employeeId: order.waiterId,
      name: order.waiter?.name ?? "Unknown",
      role: order.waiter?.role ?? null,
      orderCount: 0,
      guests: 0,
      sales: 0,
      discount: 0,
      commission: 0,
    };

    current.orderCount += 1;
    current.guests += Number(order.guests || 0);
    current.sales = toMoney(current.sales + Number(order.total));
    current.discount = toMoney(current.discount + Number(order.discountAmount));
    current.commission = toMoney(current.commission + Number(order.commissionAmount));

    byWaiter.set(order.waiterId, current);
  }

  const rows = [...byWaiter.values()]
    .map((row) => ({
      ...row,
      averageBill: row.orderCount ? toMoney(row.sales / row.orderCount) : 0,
    }))
    .sort((a, b) => b.sales - a.sales);

  res.status(200).json({
    range: { from, to },
    rows,
    totals: {
      orderCount: rows.reduce((sum, row) => sum + row.orderCount, 0),
      sales: toMoney(rows.reduce((sum, row) => sum + row.sales, 0)),
      commission: toMoney(rows.reduce((sum, row) => sum + row.commission, 0)),
    },
  });
});

/* ------------------------------------------------------------------ */
/* DASHBOARD                                                           */
/* ------------------------------------------------------------------ */

/** Today at a glance, plus the last fourteen days for the trend line. */
export const getDashboard = asyncHandler(async (_req, res) => {
  const today = businessDateOf();
  const fortnightAgo = businessDateOf(new Date(Date.now() - 13 * 86400000));

  const [todayOrders, openOrders, recentOrders, todayExpenses, creditRows] = await Promise.all([
    Order.findAll({ where: settledWhere(today, today) }),
    Order.findAll({
      where: { status: { [Op.in]: ["open", "billed"] } },
      include: [
        { model: Table, as: "table", attributes: ["id", "name"] },
        { model: Employee, as: "waiter", attributes: ["id", "name"] },
      ],
      order: [["openedAt", "ASC"]],
    }),
    Order.findAll({ where: settledWhere(fortnightAgo, today), attributes: ["businessDate", "total"] }),
    Expense.findAll({ where: { entryDate: today } }),
    CreditTransaction.findAll({ attributes: ["type", "amount"] }),
  ]);

  const trend = new Map();
  for (let offset = 13; offset >= 0; offset -= 1) {
    trend.set(businessDateOf(new Date(Date.now() - offset * 86400000)), 0);
  }
  for (const order of recentOrders) {
    if (trend.has(order.businessDate)) {
      trend.set(order.businessDate, toMoney(trend.get(order.businessDate) + Number(order.total)));
    }
  }

  const outstandingCredit = toMoney(
    creditRows.reduce(
      (sum, row) => sum + (row.type === "payment" ? -Number(row.amount) : Number(row.amount)),
      0
    )
  );

  const todaySales = toMoney(todayOrders.reduce((sum, order) => sum + Number(order.total), 0));
  const todayExpenseTotal = toMoney(todayExpenses.reduce((sum, row) => sum + Number(row.amount), 0));

  res.status(200).json({
    date: today,
    today: {
      sales: todaySales,
      orderCount: todayOrders.length,
      averageBill: todayOrders.length ? toMoney(todaySales / todayOrders.length) : 0,
      cashReceived: toMoney(todayOrders.reduce((sum, order) => sum + Number(order.paidAmount), 0)),
      expenses: todayExpenseTotal,
      netInHand: toMoney(todaySales - todayExpenseTotal),
      guests: todayOrders.reduce((sum, order) => sum + Number(order.guests || 0), 0),
    },
    outstandingCredit,
    openOrders: openOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      tableName: order.table?.name ?? null,
      waiterName: order.waiter?.name ?? null,
      status: order.status,
      total: Number(order.total),
      openedAt: order.openedAt,
    })),
    trend: [...trend.entries()].map(([date, sales]) => ({ date, sales })),
  });
});
