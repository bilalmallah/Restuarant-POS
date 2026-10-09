import createError from "http-errors";
import { Op } from "sequelize";
import Closing from "./closingModel.js";
import ClosingItem from "./closingItemModel.js";
import KitchenCategory from "../kitchen/kitchenCategoryModel.js";
import KitchenItem from "../kitchen/kitchenItemModel.js";
import User from "../users/userModel.js";
import { asyncHandler, toMoney, dayRangeWhere, toDateOnly } from "../../utils/helperFunctions.js";
import { businessDateOf } from "../../services/orderService.js";

const closingInclude = [
  {
    model: ClosingItem,
    as: "items",
    separate: true,
    order: [["sortOrder", "ASC"], ["itemName", "ASC"]],
  },
  { model: User, as: "checkedBy", attributes: ["id", "name"] },
];

const loadClosing = (id) => Closing.findByPk(id, { include: closingInclude });

/**
 * Opens (or re-opens) the sheet for a date. The line items are snapshotted from
 * the kitchen master list at the moment the sheet is created - adding a new
 * store item next week must not change what last week's closing recorded.
 */
export const openClosing = asyncHandler(async (req, res) => {
  // toDateOnly, not toISOString: yup casts "2026-09-16" to LOCAL midnight, and
  // the UTC slice of that is the 15th at UTC+5 - which filed the whole sheet
  // against yesterday and left today's screen still offering to start one.
  const businessDate = req.body.businessDate
    ? toDateOnly(req.body.businessDate)
    : businessDateOf();

  const existing = await Closing.findOne({ where: { businessDate } });
  if (existing) return res.status(200).json(await loadClosing(existing.id));

  const groups = await KitchenCategory.findAll({
    where: { isActive: true },
    order: [["sortOrder", "ASC"], ["name", "ASC"]],
    include: [
      {
        model: KitchenItem,
        as: "items",
        where: { isActive: true },
        required: false,
        separate: true,
        order: [["sortOrder", "ASC"], ["name", "ASC"]],
      },
    ],
  });

  const closing = await Closing.sequelize.transaction(async (transaction) => {
    const created = await Closing.create(
      {
        businessDate,
        status: "draft",
        checkedById: req.user.id,
        checkedByName: req.user.name,
      },
      { transaction }
    );

    let sortOrder = 0;
    const rows = [];

    for (const group of groups) {
      for (const item of group.items) {
        rows.push({
          closingId: created.id,
          kitchenItemId: item.id,
          itemName: item.name,
          categoryName: group.name,
          unit: item.unit,
          status: "available",
          inStockQuantity: 0,
          // Pre-filling from the item's usual order size turns closing into a
          // quick confirm rather than forty numbers typed at midnight.
          demandQuantity: Number(item.defaultOrderQuantity) || 0,
          sortOrder: sortOrder++,
        });
      }
    }

    if (rows.length) await ClosingItem.bulkCreate(rows, { transaction });

    return created;
  });

  res.status(201).json(await loadClosing(closing.id));
});

export const listClosings = asyncHandler(async (req, res) => {
  const { from, to, status } = req.query;

  const closings = await Closing.findAll({
    where: { ...dayRangeWhere("businessDate", from, to), ...(status && { status }) },
    include: [{ model: User, as: "checkedBy", attributes: ["id", "name"] }],
    order: [["businessDate", "DESC"]],
    limit: 180,
  });

  // The counts drive the history list badges, so they come from one query
  // rather than loading every sheet's items.
  const ids = closings.map((closing) => closing.id);
  const items = ids.length
    ? await ClosingItem.findAll({ where: { closingId: { [Op.in]: ids } }, raw: true })
    : [];

  const statsById = new Map();
  for (const item of items) {
    const stats = statsById.get(item.closingId) ?? { total: 0, low: 0, out: 0, demand: 0 };
    stats.total += 1;
    if (item.status === "low") stats.low += 1;
    if (item.status === "out") stats.out += 1;
    if (Number(item.demandQuantity) > 0) stats.demand += 1;
    statsById.set(item.closingId, stats);
  }

  res.status(200).json(
    closings.map((closing) => ({
      ...closing.toJSON(),
      stats: statsById.get(closing.id) ?? { total: 0, low: 0, out: 0, demand: 0 },
    }))
  );
});

export const getClosing = asyncHandler(async (req, res, next) => {
  const closing = await loadClosing(req.params.id);
  if (!closing) return next(createError(404, "Closing sheet not found"));
  res.status(200).json(closing);
});

/** The sheet for a date, or null so the UI can offer to start one. */
export const getClosingByDate = asyncHandler(async (req, res) => {
  const businessDate = req.params.date;
  const closing = await Closing.findOne({ where: { businessDate }, include: closingInclude });
  res.status(200).json(closing ?? null);
});

/**
 * Saves the whole sheet in one request. Staff tick down the list on a tablet
 * with patchy wifi, so a single atomic save beats forty per-row requests.
 */
export const saveClosingItems = asyncHandler(async (req, res, next) => {
  const closing = await Closing.findByPk(req.params.id);
  if (!closing) return next(createError(404, "Closing sheet not found"));
  if (closing.status === "completed")
    return next(createError(409, "This sheet is already completed"));

  const updates = Array.isArray(req.body?.items) ? req.body.items : [];

  await Closing.sequelize.transaction(async (transaction) => {
    await Promise.all(
      updates.map((item) =>
        ClosingItem.update(
          {
            ...(item.status !== undefined && { status: item.status }),
            ...(item.inStockQuantity !== undefined && {
              inStockQuantity: toMoney(item.inStockQuantity),
            }),
            ...(item.demandQuantity !== undefined && {
              demandQuantity: toMoney(item.demandQuantity),
            }),
            ...(item.note !== undefined && { note: item.note }),
          },
          { where: { id: item.id, closingId: closing.id }, transaction }
        )
      )
    );

    if (req.body.note !== undefined) await closing.update({ note: req.body.note }, { transaction });
  });

  res.status(200).json({ message: "Saved", data: await loadClosing(closing.id) });
});

export const completeClosing = asyncHandler(async (req, res, next) => {
  const closing = await Closing.findByPk(req.params.id);
  if (!closing) return next(createError(404, "Closing sheet not found"));

  await closing.update({
    status: "completed",
    completedAt: new Date(),
    checkedById: req.user.id,
    checkedByName: req.user.name,
    ...(req.body?.note !== undefined && { note: req.body.note }),
  });

  res.status(200).json({ message: "Closing completed", data: await loadClosing(closing.id) });
});

export const reopenClosing = asyncHandler(async (req, res, next) => {
  const closing = await Closing.findByPk(req.params.id);
  if (!closing) return next(createError(404, "Closing sheet not found"));

  await closing.update({ status: "draft", completedAt: null });
  res.status(200).json({ message: "Closing re-opened", data: await loadClosing(closing.id) });
});

export const deleteClosing = asyncHandler(async (req, res, next) => {
  const closing = await Closing.findByPk(req.params.id);
  if (!closing) return next(createError(404, "Closing sheet not found"));

  await closing.destroy();
  res.status(200).json({ message: "Closing sheet deleted" });
});

/**
 * Tomorrow's shopping list: only what actually has to be bought, grouped by
 * category so the buyer walks the market once. This is the sheet that prints.
 */
export const getShoppingList = asyncHandler(async (req, res, next) => {
  const closing = await loadClosing(req.params.id);
  if (!closing) return next(createError(404, "Closing sheet not found"));

  const needed = closing.items.filter(
    (item) => Number(item.demandQuantity) > 0 || item.status === "out" || item.status === "low"
  );

  const groups = new Map();
  for (const item of needed) {
    const key = item.categoryName || "Other";
    if (!groups.has(key)) groups.set(key, []);

    groups.get(key).push({
      id: item.id,
      name: item.itemName,
      unit: item.unit,
      status: item.status,
      inStockQuantity: Number(item.inStockQuantity),
      demandQuantity: Number(item.demandQuantity),
      note: item.note,
    });
  }

  res.status(200).json({
    closingId: closing.id,
    businessDate: closing.businessDate,
    checkedByName: closing.checkedByName,
    status: closing.status,
    note: closing.note,
    totalItems: closing.items.length,
    outOfStock: closing.items.filter((item) => item.status === "out").length,
    lowStock: closing.items.filter((item) => item.status === "low").length,
    groups: [...groups.entries()].map(([name, items]) => ({ name, items })),
  });
});
