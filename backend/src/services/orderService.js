import { Op } from "sequelize";
import Order from "../features/orders/orderModel.js";
import OrderItem from "../features/orders/orderItemModel.js";
import Table from "../features/tables/tableModel.js";
import Employee from "../features/employees/employeeModel.js";
import CreditPerson from "../features/credit/creditPersonModel.js";
import CreditAccount from "../features/credit/creditAccountModel.js";
import User from "../features/users/userModel.js";
import { toMoney, buildOrderNumber } from "../utils/helperFunctions.js";

export const orderInclude = [
  { model: OrderItem, as: "items", separate: true, order: [["id", "ASC"]] },
  { model: Table, as: "table", attributes: ["id", "name", "area"] },
  { model: Employee, as: "waiter", attributes: ["id", "name", "commissionPercent"] },
  { model: User, as: "createdBy", attributes: ["id", "name"] },
  { model: CreditPerson, as: "creditPerson", attributes: ["id", "name", "phone"] },
  { model: CreditAccount, as: "creditAccount", attributes: ["id", "name"] },
];

/** Local calendar date as YYYY-MM-DD. A restaurant day is a local-time thing. */
export const businessDateOf = (date = new Date()) => {
  const d = new Date(date);
  const offsetMinutes = d.getTimezoneOffset();
  return new Date(d.getTime() - offsetMinutes * 60000).toISOString().slice(0, 10);
};

/**
 * Per-day running number. Two tills can open a table in the same second, so the
 * unique index on (businessDate, orderNumber) is the real guard - this just
 * picks the next free number, and the controller retries on a clash.
 */
export const nextOrderNumber = async (businessDate, transaction) => {
  const count = await Order.count({ where: { businessDate }, transaction });
  return buildOrderNumber(count);
};

/**
 * Single source of truth for order money. Called after every item change and
 * before every settlement, so the stored totals can never drift from the lines.
 *
 * Order of operations matters and is deliberate:
 *   subtotal -> discount -> tax on the discounted amount -> charges
 * Taxing before the discount would overcharge the customer.
 */
export const recalcOrderTotals = async (order, { transaction } = {}) => {
  const items = await OrderItem.findAll({ where: { orderId: order.id }, transaction });

  const subtotal = toMoney(
    items.reduce((total, item) => total + Number(item.quantity) * Number(item.unitPrice), 0)
  );

  const discountValue = Number(order.discountValue) || 0;
  let discountAmount =
    order.discountType === "percent"
      ? toMoney((subtotal * discountValue) / 100)
      : toMoney(discountValue);

  // A discount larger than the bill would produce a negative total and a
  // refund the restaurant never agreed to.
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);

  const taxable = toMoney(subtotal - discountAmount);
  const taxAmount = toMoney((taxable * (Number(order.taxPercent) || 0)) / 100);
  const total = toMoney(
    taxable + taxAmount + (Number(order.serviceCharge) || 0) + (Number(order.deliveryCharge) || 0)
  );

  const commissionPercent = Number(order.commissionPercent) || 0;
  const commissionAmount = toMoney((taxable * commissionPercent) / 100);

  await order.update({ subtotal, discountAmount, taxAmount, total, commissionAmount }, { transaction });

  return order;
};

/** Keeps the denormalised table light in sync with its order. */
export const syncTableStatus = async (tableId, { transaction } = {}) => {
  if (!tableId) return;

  const live = await Order.findOne({
    where: { tableId, status: { [Op.in]: ["open", "billed"] } },
    transaction,
  });

  await Table.update(
    { status: live ? "occupied" : "free" },
    { where: { id: tableId }, transaction }
  );
};

export const loadOrder = (id, options = {}) =>
  Order.findByPk(id, { include: orderInclude, ...options });

/**
 * What the kitchen has not seen yet. A waiter who adds one more paratha to a
 * running table should get a token with just that paratha on it, not a reprint
 * of the entire meal, so tokens are always the delta.
 */
export const pendingKitchenLines = (items) =>
  items
    .filter((item) => item.printToKitchen && !item.isReturned)
    .map((item) => ({
      id: item.id,
      name: item.name,
      variantLabel: item.variantLabel,
      note: item.note,
      quantity: toMoney(Number(item.quantity) - Number(item.printedQuantity)),
    }))
    .filter((line) => line.quantity > 0);
