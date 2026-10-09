import createError from "http-errors";
import { Op, UniqueConstraintError } from "sequelize";
import Order from "./orderModel.js";
import OrderItem from "./orderItemModel.js";
import Product from "../products/productModel.js";
import Employee from "../employees/employeeModel.js";
import CreditPerson from "../credit/creditPersonModel.js";
import CreditAccount from "../credit/creditAccountModel.js";
import CreditTransaction from "../credit/creditTransactionModel.js";
import EmployeeLedger from "../payroll/employeeLedgerModel.js";
import User from "../users/userModel.js";
import { asyncHandler, toMoney, dayRangeWhere } from "../../utils/helperFunctions.js";
import { getSettings } from "../../services/settingsService.js";
import {
  orderInclude,
  businessDateOf,
  nextOrderNumber,
  recalcOrderTotals,
  syncTableStatus,
  loadOrder,
  pendingKitchenLines,
} from "../../services/orderService.js";

const OPEN_STATES = ["open", "billed"];

const mustBeEditable = (order) => {
  if (!OPEN_STATES.includes(order.status))
    throw createError(409, `This bill is already ${order.status} and can no longer be changed`);
};

/**
 * Menu prices are read from the database, never trusted from the browser - but
 * a price the cashier deliberately typed over (double-click on the order
 * screen) is honoured, and the list price is kept beside it so a discount
 * report can still show what was given away.
 */
const insertItems = async (order, items, userId, transaction) => {
  const productIds = items.map((item) => item.productId).filter(Boolean);

  const products = productIds.length
    ? await Product.findAll({
        where: { id: { [Op.in]: productIds } },
        include: [{ association: "category", attributes: ["name"] }],
        transaction,
      })
    : [];

  const productById = new Map(products.map((product) => [product.id, product]));

  const rows = items.map((item) => {
    const product = item.productId ? productById.get(item.productId) : null;
    const listPrice = product ? Number(product.price) : Number(item.unitPrice);
    const unitPrice = item.unitPrice === undefined ? listPrice : toMoney(item.unitPrice);
    const quantity = toMoney(item.quantity ?? 1);

    return {
      orderId: order.id,
      productId: product?.id ?? null,
      name: product?.name ?? item.name,
      variantLabel: product?.variantLabel ?? item.variantLabel ?? null,
      categoryName: product?.category?.name ?? null,
      unitPrice,
      originalPrice: listPrice,
      quantity,
      lineTotal: toMoney(unitPrice * quantity),
      printToKitchen: item.printToKitchen ?? product?.printToKitchen ?? true,
      note: item.note ?? null,
      createdById: userId,
    };
  });

  return OrderItem.bulkCreate(rows, { transaction });
};

/* ------------------------------------------------------------------ */
/* CREATE                                                              */
/* ------------------------------------------------------------------ */

export const createOrder = asyncHandler(async (req, res, next) => {
  const { tableId, items = [], ...rest } = req.body;

  if (tableId) {
    const busy = await Order.findOne({ where: { tableId, status: { [Op.in]: OPEN_STATES } } });
    if (busy) return next(createError(409, "This table already has a running order"));
  }

  const settings = await getSettings();
  const businessDate = businessDateOf();

  // Two tills can open a table in the same second. The unique index rejects the
  // loser, so take the next number and try again rather than locking the table.
  const MAX_ATTEMPTS = 5;
  let order;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      order = await Order.sequelize.transaction(async (transaction) => {
        const orderNumber = await nextOrderNumber(businessDate, transaction);

        const waiter = rest.waiterId ? await Employee.findByPk(rest.waiterId, { transaction }) : null;

        const created = await Order.create(
          {
            ...rest,
            tableId,
            orderNumber,
            businessDate,
            createdById: req.user.id,
            taxPercent: Number(settings.taxPercent) || 0,
            commissionPercent:
              Number(waiter?.commissionPercent) || Number(settings.defaultCommissionPercent) || 0,
            openedAt: new Date(),
          },
          { transaction }
        );

        if (items.length) await insertItems(created, items, req.user.id, transaction);

        await recalcOrderTotals(created, { transaction });
        await syncTableStatus(tableId, { transaction });

        return created;
      });

      break;
    } catch (error) {
      if (error instanceof UniqueConstraintError && attempt < MAX_ATTEMPTS - 1) continue;
      throw error;
    }
  }

  res.status(201).json({ message: "Order started", data: await loadOrder(order.id) });
});

/* ------------------------------------------------------------------ */
/* READ                                                                */
/* ------------------------------------------------------------------ */

export const listOrders = asyncHandler(async (req, res) => {
  const { status, from, to, tableId, waiterId, creditPersonId, search, limit = 200 } = req.query;

  const where = {
    ...dayRangeWhere("openedAt", from, to),
    ...(status && { status: { [Op.in]: String(status).split(",") } }),
    ...(tableId && { tableId }),
    ...(waiterId && { waiterId }),
    ...(creditPersonId && { creditPersonId }),
    ...(search && {
      [Op.or]: [
        { orderNumber: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } },
        { customerPhone: { [Op.iLike]: `%${search}%` } },
      ],
    }),
  };

  const orders = await Order.findAll({
    where,
    include: orderInclude.filter((item) => item.as !== "items"),
    order: [["openedAt", "DESC"]],
    limit: Math.min(Number(limit) || 200, 500),
  });

  res.status(200).json(orders);
});

/** Everything currently running, for the live-orders strip above the floor. */
export const listActiveOrders = asyncHandler(async (_req, res) => {
  const orders = await Order.findAll({
    where: { status: { [Op.in]: OPEN_STATES } },
    include: orderInclude,
    order: [["openedAt", "ASC"]],
  });

  res.status(200).json(orders);
});

export const getOrder = asyncHandler(async (req, res, next) => {
  const order = await loadOrder(req.params.id);
  if (!order) return next(createError(404, "Order not found"));
  res.status(200).json(order);
});

/* ------------------------------------------------------------------ */
/* UPDATE HEADER  (waiter, table, discount, charges)                   */
/* ------------------------------------------------------------------ */

export const updateOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));
  mustBeEditable(order);

  const previousTableId = order.tableId;

  if (req.body.tableId && req.body.tableId !== previousTableId) {
    const busy = await Order.findOne({
      where: {
        tableId: req.body.tableId,
        status: { [Op.in]: OPEN_STATES },
        id: { [Op.ne]: order.id },
      },
    });
    if (busy) return next(createError(409, "That table already has a running order"));
  }

  await order.update(req.body);
  await recalcOrderTotals(order);

  await syncTableStatus(order.tableId);
  if (previousTableId && previousTableId !== order.tableId) await syncTableStatus(previousTableId);

  res.status(200).json({ message: "Order updated", data: await loadOrder(order.id) });
});

/* ------------------------------------------------------------------ */
/* ITEMS                                                               */
/* ------------------------------------------------------------------ */

export const addOrderItem = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));
  mustBeEditable(order);

  await Order.sequelize.transaction(async (transaction) => {
    /**
     * Tapping the same product twice should read as "2 x Paratha" on one line,
     * not two lines - but only when the price and note match, otherwise a
     * hand-edited price would be silently overwritten.
     */
    const existing = req.body.productId
      ? await OrderItem.findOne({
          where: {
            orderId: order.id,
            productId: req.body.productId,
            unitPrice: toMoney(req.body.unitPrice),
            note: req.body.note ?? null,
            isReturned: false,
          },
          transaction,
        })
      : null;

    if (existing) {
      const quantity = toMoney(Number(existing.quantity) + Number(req.body.quantity ?? 1));
      await existing.update(
        { quantity, lineTotal: toMoney(quantity * Number(existing.unitPrice)) },
        { transaction }
      );
    } else {
      await insertItems(order, [req.body], req.user.id, transaction);
    }

    await recalcOrderTotals(order, { transaction });
  });

  res.status(201).json({ message: "Item added", data: await loadOrder(order.id) });
});

export const updateOrderItem = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));
  mustBeEditable(order);

  const item = await OrderItem.findOne({ where: { id: req.params.itemId, orderId: order.id } });
  if (!item) return next(createError(404, "Item not found on this order"));

  // Dropping to zero is how the minus button removes a line.
  if (req.body.quantity !== undefined && Number(req.body.quantity) === 0) {
    await item.destroy();
    await recalcOrderTotals(order);
    return res.status(200).json({ message: "Item removed", data: await loadOrder(order.id) });
  }

  const quantity = req.body.quantity !== undefined ? toMoney(req.body.quantity) : Number(item.quantity);
  const unitPrice =
    req.body.unitPrice !== undefined ? toMoney(req.body.unitPrice) : Number(item.unitPrice);

  await item.update({
    ...req.body,
    quantity,
    unitPrice,
    lineTotal: toMoney(quantity * unitPrice),
  });

  await recalcOrderTotals(order);
  res.status(200).json({ message: "Item updated", data: await loadOrder(order.id) });
});

export const removeOrderItem = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));
  mustBeEditable(order);

  const item = await OrderItem.findOne({ where: { id: req.params.itemId, orderId: order.id } });
  if (!item) return next(createError(404, "Item not found on this order"));

  await item.destroy();
  await recalcOrderTotals(order);

  res.status(200).json({ message: "Item removed", data: await loadOrder(order.id) });
});

/* ------------------------------------------------------------------ */
/* KITCHEN TOKEN                                                       */
/* ------------------------------------------------------------------ */

/**
 * The kitchen token, in two modes.
 *
 * DEFAULT - no itemIds in the body. Prints only what the kitchen has not been
 * told about yet, then marks it sent. A waiter who adds one more paratha to a
 * running table gets a token with just that paratha on it.
 *
 * REPRINT - itemIds given. Prints exactly those lines at their full current
 * quantity, whether or not they were sent before. The kitchen loses tokens,
 * the printer jams, and a cook asks "what was on table 4 again?" - refusing to
 * reprint just means somebody walks over and shouts it instead.
 *
 * `?preview=true` reads the pending lines without consuming them, so the screen
 * can show a "3 waiting" badge without clearing the queue.
 */
export const printKitchenToken = asyncHandler(async (req, res, next) => {
  const order = await loadOrder(req.params.id);
  if (!order) return next(createError(404, "Order not found"));

  const preview = req.query.preview === "true";
  const requestedIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds.map(Number) : null;
  const isReprint = Boolean(requestedIds?.length);

  const printable = order.items.filter((item) => item.printToKitchen && !item.isReturned);

  const lines = isReprint
    ? printable
        .filter((item) => requestedIds.includes(item.id))
        .map((item) => ({
          id: item.id,
          name: item.name,
          variantLabel: item.variantLabel,
          note: item.note,
          quantity: toMoney(item.quantity),
        }))
    : pendingKitchenLines(order.items);

  if (!lines.length)
    return next(
      createError(400, isReprint ? "No items selected" : "The kitchen already has everything on this order")
    );

  // Only the lines actually on this token are marked as sent. Marking every
  // printable line would silently swallow items the cook never saw.
  if (!preview) {
    const printedIds = new Set(lines.map((line) => line.id));

    await Promise.all(
      printable
        .filter((item) => printedIds.has(item.id))
        .map((item) => item.update({ printedQuantity: item.quantity }))
    );
  }

  res.status(200).json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    tableName: order.table?.name ?? null,
    waiterName: order.waiter?.name ?? null,
    orderType: order.orderType,
    guests: order.guests,
    note: order.note,
    printedAt: new Date(),
    isReprint,
    lines,
  });
});

/* ------------------------------------------------------------------ */
/* BILL                                                                */
/* ------------------------------------------------------------------ */

/**
 * Moves the order to `billed` and hands back everything the receipt needs.
 * Reprints are counted rather than blocked - the counter genuinely does
 * reprint when the thermal paper jams - but the count makes it auditable.
 */
export const printBill = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));

  if (order.status === "void") return next(createError(409, "This bill was cancelled"));

  await recalcOrderTotals(order);
  await order.update({
    status: order.status === "open" ? "billed" : order.status,
    billPrintCount: order.billPrintCount + 1,
  });

  await syncTableStatus(order.tableId);

  const fresh = await loadOrder(order.id);
  res.status(200).json({
    message: "Bill ready",
    isReprint: fresh.billPrintCount > 1,
    data: fresh,
  });
});

/* ------------------------------------------------------------------ */
/* SETTLE                                                              */
/* ------------------------------------------------------------------ */

/**
 * Posting the waiter commission here, at settlement, is deliberate: commission
 * is earned on money actually collected, and the rate is frozen on the order so
 * a later change to the house rate cannot rewrite last week's payroll.
 */
const postWaiterCommission = async (order, userId, transaction) => {
  if (!order.waiterId) return;

  const amount = toMoney(order.commissionAmount);
  if (amount <= 0) return;

  await EmployeeLedger.create(
    {
      employeeId: order.waiterId,
      type: "commission",
      amount,
      entryDate: order.businessDate,
      description: `Order #${order.orderNumber}`,
      createdById: userId,
    },
    { transaction }
  );
};

export const settleOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));

  if (!OPEN_STATES.includes(order.status))
    return next(createError(409, `This bill is already ${order.status}`));

  await recalcOrderTotals(order);

  const { paymentMethod, paidAmount, tenderedAmount, note } = req.body;

  if (toMoney(paidAmount) < toMoney(order.total)) {
    return next(
      createError(
        400,
        "Received amount is less than the bill. Use Credit to record the remaining balance."
      )
    );
  }

  await Order.sequelize.transaction(async (transaction) => {
    await order.update(
      {
        status: "paid",
        paymentMethod,
        paidAmount: toMoney(paidAmount),
        tenderedAmount: toMoney(tenderedAmount || paidAmount),
        note: note ?? order.note,
        closedAt: new Date(),
      },
      { transaction }
    );

    await postWaiterCommission(order, req.user.id, transaction);
    await syncTableStatus(order.tableId, { transaction });
  });

  const fresh = await loadOrder(order.id);
  res.status(200).json({
    message: "Payment recorded",
    change: toMoney(Number(fresh.tenderedAmount) - Number(fresh.total)),
    data: fresh,
  });
});

/* ------------------------------------------------------------------ */
/* CREDIT (khata)                                                      */
/* ------------------------------------------------------------------ */

/**
 * Sends the unpaid part of a bill to someone's khata account. Part payment is
 * allowed: hand over 3500 of a 5000 bill and 1500 lands in the book, which is
 * exactly how the counter already works on paper.
 */
export const sendOrderToCredit = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));

  if (!OPEN_STATES.includes(order.status))
    return next(createError(409, `This bill is already ${order.status}`));

  const { creditPersonId, creditAccountId, paidAmount = 0, description } = req.body;

  const person = await CreditPerson.findByPk(creditPersonId);
  if (!person) return next(createError(404, "Credit person not found"));
  if (!person.isActive) return next(createError(409, `${person.name} is not allowed credit`));

  const account = await CreditAccount.findOne({
    where: { id: creditAccountId, creditPersonId },
  });
  if (!account) return next(createError(404, "That account does not belong to this person"));

  await recalcOrderTotals(order);

  const total = toMoney(order.total);
  const paid = toMoney(paidAmount);
  const onCredit = toMoney(total - paid);

  if (paid > total) return next(createError(400, "Received amount is more than the bill"));
  if (onCredit <= 0)
    return next(createError(400, "Nothing left to put on credit - settle this as a normal payment"));

  await Order.sequelize.transaction(async (transaction) => {
    await order.update(
      {
        status: "credit",
        paymentMethod: paid > 0 ? "split" : "credit",
        paidAmount: paid,
        tenderedAmount: paid,
        creditPersonId,
        creditAccountId,
        closedAt: new Date(),
      },
      { transaction }
    );

    await CreditTransaction.create(
      {
        creditPersonId,
        creditAccountId,
        orderId: order.id,
        type: "credit",
        amount: onCredit,
        entryDate: order.businessDate,
        description: description || `Bill #${order.orderNumber}`,
        createdById: req.user.id,
      },
      { transaction }
    );

    await postWaiterCommission(order, req.user.id, transaction);
    await syncTableStatus(order.tableId, { transaction });
  });

  res.status(200).json({
    message: `${toMoney(onCredit)} added to ${person.name}'s account`,
    data: await loadOrder(order.id),
  });
});

/* ------------------------------------------------------------------ */
/* VOID / DELETE                                                       */
/* ------------------------------------------------------------------ */

/**
 * Cancelled bills are marked, never deleted: a missing order number in the day
 * sheet is what theft looks like, so the row stays with a reason on it.
 */
export const voidOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));
  if (order.status === "void") return next(createError(409, "This bill is already cancelled"));

  // Re-authenticate. A till left unlocked is the normal state of a restaurant
  // counter, and cancelling a bill is how takings walk out of the door.
  const account = await User.scope("withPassword").findByPk(req.user.id);
  if (!account || !(await account.validatePassword(req.body.password))) {
    return next(createError(401, "That password is not correct"));
  }

  await Order.sequelize.transaction(async (transaction) => {
    await order.update(
      { status: "void", voidReason: req.body.voidReason, closedAt: new Date() },
      { transaction }
    );

    // Commission and credit posted at settlement have to come back off.
    await EmployeeLedger.destroy({
      where: { employeeId: order.waiterId ?? 0, description: `Order #${order.orderNumber}` },
      transaction,
    });
    await CreditTransaction.destroy({ where: { orderId: order.id }, transaction });

    await syncTableStatus(order.tableId, { transaction });
  });

  res.status(200).json({ message: "Bill cancelled", data: await loadOrder(order.id) });
});

export const deleteOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));

  const tableId = order.tableId;

  await Order.sequelize.transaction(async (transaction) => {
    await CreditTransaction.destroy({ where: { orderId: order.id }, transaction });
    await order.destroy({ transaction });
    await syncTableStatus(tableId, { transaction });
  });

  res.status(200).json({ message: "Order deleted" });
});

/** Re-opening a settled bill, e.g. the party ordered one more tea after paying. */
export const reopenOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return next(createError(404, "Order not found"));

  if (order.status === "credit")
    return next(
      createError(409, "Settle or reverse the credit entry before re-opening this bill")
    );

  await order.update({ status: "open", paymentMethod: null, paidAmount: 0, closedAt: null });
  await syncTableStatus(order.tableId);

  res.status(200).json({ message: "Bill re-opened", data: await loadOrder(order.id) });
});
