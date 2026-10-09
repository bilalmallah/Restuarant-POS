import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import config from "../config/config.js";

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const generateToken = (id, email, role) =>
  jwt.sign({ id, email, role }, config.authJwtSecretKey, { expiresIn: config.authJwtExpiresIn });

export const buildAuthResponse = (user, token) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  ...(token && { token }),
});

/**
 * Money in this app is rupees with two decimals. Sequelize hands DECIMAL back as
 * a string (to protect precision), so anything arithmetic has to pass through
 * here first or `"100" + "50"` silently becomes `"10050"`.
 */
export const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const sumBy = (rows, key) => toMoney(rows.reduce((total, row) => total + Number(row[key] || 0), 0));

/**
 * Report filters arrive as plain "YYYY-MM-DD" strings. Postgres TIMESTAMPTZ
 * comparisons need real day boundaries, otherwise "to" excludes everything
 * that happened after midnight on the final day.
 */
export const dayRangeWhere = (field, from, to) => {
  const where = {};
  if (from) where[Op.gte] = new Date(`${from}T00:00:00.000`);
  if (to) where[Op.lte] = new Date(`${to}T23:59:59.999`);
  return Object.getOwnPropertySymbols(where).length ? { [field]: where } : {};
};

/**
 * Local calendar date as YYYY-MM-DD.
 *
 * Never round-trip a date through toISOString() for this: yup casts a
 * "2026-09-10" body field to LOCAL midnight, and in a +05:00 timezone that is
 * 19:00 UTC the previous day - so the UTC slice files every expense, salary and
 * khata entry one day early. Reading the local parts keeps the day the user
 * actually typed.
 */
export const toDateOnly = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Order numbers must stay human-readable on a printed token ("#0042 · 14 Sep"),
 * so they are a per-day running counter rather than the database id.
 */
export const buildOrderNumber = (dailyCount) => String(dailyCount + 1).padStart(4, "0");

export const pickDefined = (source, keys) =>
  keys.reduce((result, key) => {
    if (source[key] !== undefined) result[key] = source[key];
    return result;
  }, {});
