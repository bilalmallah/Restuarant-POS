import jwt from "jsonwebtoken";
import createError from "http-errors";
import config from "../config/config.js";
import User from "../features/users/userModel.js";

export const authMiddleware = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer "))
      throw createError(401, "Not authorized, token missing");

    const decoded = jwt.verify(authHeader.split(" ")[1], config.authJwtSecretKey);
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ["password"] } });

    if (!user) throw createError(401, "User not found");
    if (!user.isActive) throw createError(403, "This account has been disabled");

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Cashiers run the floor all evening, so the destructive screens (deleting
 * sales history, editing payroll, changing prices) are gated behind a role
 * rather than hidden in the UI alone.
 */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(createError(401, "Not authorized"));
  if (!roles.includes(req.user.role))
    return next(createError(403, "You do not have permission to perform this action"));
  next();
};
