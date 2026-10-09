import createError from "http-errors";
import { Op } from "sequelize";
import Table from "./tableModel.js";
import Order from "../orders/orderModel.js";
import Employee from "../employees/employeeModel.js";
import { crudController } from "../../utils/crudFactory.js";
import { asyncHandler } from "../../utils/helperFunctions.js";

const base = crudController({
  model: Table,
  label: "Table",
  searchFields: ["name", "area"],
  defaultOrder: [["sortOrder", "ASC"], ["name", "ASC"]],
  beforeDestroy: async (table) => {
    const openOrder = await Order.findOne({ where: { tableId: table.id, status: "open" } });
    if (openOrder) throw createError(409, `${table.name} still has a running order`);
  },
});

/**
 * The POS floor screen. Returns every table with the live order sitting on it,
 * so one request paints the whole grid - who is serving, how long they have
 * been seated and what the running total is.
 */
export const getFloor = asyncHandler(async (_req, res) => {
  const tables = await Table.findAll({
    where: { isActive: true },
    order: [["sortOrder", "ASC"], ["name", "ASC"]],
  });

  const openOrders = await Order.findAll({
    where: { status: { [Op.in]: ["open", "billed"] }, tableId: { [Op.ne]: null } },
    include: [{ model: Employee, as: "waiter", attributes: ["id", "name"] }],
    order: [["openedAt", "ASC"]],
  });

  const orderByTable = new Map();
  for (const order of openOrders) {
    if (!orderByTable.has(order.tableId)) orderByTable.set(order.tableId, order);
  }

  const areas = [...new Set(tables.map((table) => table.area))];

  res.status(200).json({
    areas,
    tables: tables.map((table) => {
      const order = orderByTable.get(table.id);

      return {
        id: table.id,
        name: table.name,
        area: table.area,
        capacity: table.capacity,
        // The stored status can drift if an order is deleted straight from the
        // database, so the live order is the authority here.
        status: order ? (order.status === "billed" ? "billed" : "occupied") : table.status,
        sortOrder: table.sortOrder,
        order: order
          ? {
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              total: Number(order.total),
              guests: order.guests,
              openedAt: order.openedAt,
              waiterName: order.waiter?.name ?? null,
            }
          : null,
      };
    }),
  });
});

/** Moving a party to a bigger table mid-meal, without re-entering the order. */
export const transferOrder = asyncHandler(async (req, res, next) => {
  const { orderId, toTableId } = req.body;

  const order = await Order.findByPk(orderId);
  if (!order) return next(createError(404, "Order not found"));
  if (order.status !== "open") return next(createError(409, "Only a running order can be moved"));

  const target = await Table.findByPk(toTableId);
  if (!target) return next(createError(404, "Target table not found"));

  const busy = await Order.findOne({
    where: { tableId: toTableId, status: "open", id: { [Op.ne]: order.id } },
  });
  if (busy) return next(createError(409, `${target.name} is already occupied`));

  const previousTableId = order.tableId;
  await order.update({ tableId: toTableId });

  await Table.update({ status: "occupied" }, { where: { id: toTableId } });
  if (previousTableId && previousTableId !== toTableId) {
    await Table.update({ status: "free" }, { where: { id: previousTableId } });
  }

  res.status(200).json({ message: `Order moved to ${target.name}`, data: order });
});

export const { list, getOne, create, update, destroy, toggleActive, reorder } = base;
