import createError from "http-errors";
import { asyncHandler } from "./helperFunctions.js";

/**
 * Six of the setup screens (tables, menu categories, products, employees,
 * kitchen categories, kitchen items) are the same CRUD screen with a different
 * noun. Writing six near-identical controllers meant six places to fix the next
 * pagination or soft-delete bug, so they share this factory instead. Anything
 * with real behaviour - orders, credit, payroll, closings - gets a hand-written
 * controller.
 */
export const crudController = ({
  model,
  label,
  /** Columns that `?search=` matches against with ILIKE. */
  searchFields = ["name"],
  /** Sequelize `include` used by list and getOne. */
  include = [],
  defaultOrder = [["sortOrder", "ASC"], ["name", "ASC"]],
  /** Runs before create/update; throw to reject, return an object to merge in. */
  beforeSave,
  /** Runs before destroy; throw an http-error to block the delete. */
  beforeDestroy,
}) => {
  const { Op } = model.sequelize.Sequelize;

  const buildWhere = (query) => {
    const where = {};

    if (query.search) {
      where[Op.or] = searchFields.map((field) => ({ [field]: { [Op.iLike]: `%${query.search}%` } }));
    }

    // "?isActive=true" arrives as a string; only filter when it was actually sent.
    if (query.isActive === "true" || query.isActive === "false") {
      where.isActive = query.isActive === "true";
    }

    for (const key of ["categoryId", "kitchenCategoryId", "role", "payType", "area", "status"]) {
      if (query[key] !== undefined && query[key] !== "") where[key] = query[key];
    }

    return where;
  };

  const list = asyncHandler(async (req, res) => {
    const rows = await model.findAll({
      where: buildWhere(req.query),
      include,
      order: defaultOrder,
    });
    res.status(200).json(rows);
  });

  const getOne = asyncHandler(async (req, res, next) => {
    const row = await model.findByPk(req.params.id, { include });
    if (!row) return next(createError(404, `${label} not found`));
    res.status(200).json(row);
  });

  const create = asyncHandler(async (req, res) => {
    const extra = beforeSave ? await beforeSave(req.body, null, req) : {};

    // Without this every new row is created at sortOrder 0 and quietly lands in
    // front of everything already there. New things belong at the end.
    const sortOrder =
      req.body.sortOrder ?? ((await model.max("sortOrder")) || 0) + 1;

    const created = await model.create({ ...req.body, sortOrder, ...extra });
    const row = include.length ? await model.findByPk(created.id, { include }) : created;
    res.status(201).json({ message: `${label} created successfully`, data: row });
  });

  const update = asyncHandler(async (req, res, next) => {
    const row = await model.findByPk(req.params.id);
    if (!row) return next(createError(404, `${label} not found`));

    const extra = beforeSave ? await beforeSave(req.body, row, req) : {};
    await row.update({ ...req.body, ...extra });

    const fresh = include.length ? await model.findByPk(row.id, { include }) : row;
    res.status(200).json({ message: `${label} updated successfully`, data: fresh });
  });

  const destroy = asyncHandler(async (req, res, next) => {
    const row = await model.findByPk(req.params.id);
    if (!row) return next(createError(404, `${label} not found`));

    if (beforeDestroy) await beforeDestroy(row, req);

    await row.destroy();
    res.status(200).json({ message: `${label} deleted successfully` });
  });

  /**
   * Deleting a product that already appears on last month's bills would blank
   * out the report, so the UI offers "deactivate" as the safe alternative.
   */
  const toggleActive = asyncHandler(async (req, res, next) => {
    const row = await model.findByPk(req.params.id);
    if (!row) return next(createError(404, `${label} not found`));

    await row.update({ isActive: !row.isActive });
    res.status(200).json({
      message: `${label} ${row.isActive ? "activated" : "deactivated"}`,
      data: row,
    });
  });

  /** Drag-and-drop ordering on the POS grid saves the whole list at once. */
  const reorder = asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    await model.sequelize.transaction(async (transaction) => {
      await Promise.all(
        items.map(({ id, sortOrder }) =>
          model.update({ sortOrder }, { where: { id }, transaction })
        )
      );
    });

    res.status(200).json({ message: "Order saved" });
  });

  return { list, getOne, create, update, destroy, toggleActive, reorder };
};

/**
 * Mounts the seven routes the factory produces. `guards` lets a feature demand
 * a role for the write half while leaving reads open to the till.
 */
export const crudRoutes = (router, controller, { validator, guards = [] } = {}) => {
  const write = [...guards, ...(validator ? [validator] : [])];

  router.get("/", controller.list);
  router.post("/reorder", ...guards, controller.reorder);
  router.get("/:id", controller.getOne);
  router.post("/", ...write, controller.create);
  router.put("/:id", ...write, controller.update);
  router.patch("/:id/toggle-active", ...guards, controller.toggleActive);
  router.delete("/:id", ...guards, controller.destroy);

  return router;
};
