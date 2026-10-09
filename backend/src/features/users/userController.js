import createError from "http-errors";
import { Op } from "sequelize";
import User from "./userModel.js";
import { asyncHandler, generateToken, buildAuthResponse } from "../../utils/helperFunctions.js";

/**
 * Staff log in with a username, not an email. A waiter who has never owned an
 * email address still needs to punch in, and the counter machine is shared.
 */
export const login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.scope("withPassword").findOne({
    where: { username: username.trim().toLowerCase() },
  });

  // Same message either way, so a wrong guess cannot confirm a real username.
  if (!user || !(await user.validatePassword(password)))
    return next(createError(401, "Wrong username or password"));

  if (!user.isActive) return next(createError(403, "This account has been disabled"));

  const token = generateToken(user.id, user.email, user.role);
  res.status(200).json(buildAuthResponse(user, token));
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(buildAuthResponse(req.user));
});

export const changeMyPassword = asyncHandler(async (req, res, next) => {
  const user = await User.scope("withPassword").findByPk(req.user.id);

  if (!(await user.validatePassword(req.body.currentPassword)))
    return next(createError(401, "Your current password is not correct"));

  await user.update({ password: req.body.newPassword });
  res.status(200).json({ message: "Password changed" });
});

/* ---------------- User management (admin) ---------------- */

export const listUsers = asyncHandler(async (req, res) => {
  const where = req.query.search
    ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${req.query.search}%` } },
          { username: { [Op.iLike]: `%${req.query.search}%` } },
        ],
      }
    : {};

  const users = await User.findAll({ where, order: [["name", "ASC"]] });
  res.status(200).json(users);
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json({ message: "User created", data: buildAuthResponse(user) });
});

export const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return next(createError(404, "User not found"));

  // Locking yourself out of your own admin account is not recoverable in-app.
  if (user.id === req.user.id && req.body.isActive === false)
    return next(createError(400, "You cannot disable your own account"));

  if (user.id === req.user.id && req.body.role && req.body.role !== user.role)
    return next(createError(400, "You cannot change your own role"));

  const changes = { ...req.body };
  if (!changes.password) delete changes.password;

  await user.update(changes);
  res.status(200).json({ message: "User updated", data: buildAuthResponse(user) });
});

export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return next(createError(404, "User not found"));
  if (user.id === req.user.id) return next(createError(400, "You cannot delete your own account"));

  const adminCount = await User.count({ where: { role: "admin", isActive: true } });
  if (user.role === "admin" && adminCount <= 1)
    return next(createError(400, "The last admin account cannot be deleted"));

  await user.destroy();
  res.status(200).json({ message: "User deleted" });
});
