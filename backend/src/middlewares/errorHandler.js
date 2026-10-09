import createError from "http-errors";
import { UniqueConstraintError, ValidationError, ForeignKeyConstraintError } from "sequelize";

const respond = (res, req, statusCode, message, extra = {}) =>
  res.status(statusCode).json({
    statusCode,
    message,
    path: req.originalUrl,
    method: req.method,
    ...extra,
  });

const errorHandler = (err, req, res, _next) => {
  console.error("ERROR:", err.message);

  if (err instanceof UniqueConstraintError)
    return respond(res, req, 409, err.errors[0]?.message || "This record already exists");

  if (err instanceof ForeignKeyConstraintError)
    return respond(res, req, 409, "This record is still in use and cannot be removed");

  if (err instanceof ValidationError)
    return respond(res, req, 400, err.errors[0]?.message || "Validation error");

  if (err.name === "JsonWebTokenError")
    return respond(res, req, 401, "Invalid token. Please login again.");

  if (err.name === "TokenExpiredError")
    return respond(res, req, 401, "Session expired. Please login again.");

  if (createError.isHttpError(err))
    return respond(res, req, err.status || 500, err.message);

  const isDev = process.env.NODE_ENV === "development";
  return respond(res, req, 500, isDev ? err.message || "Something went wrong" : "Something went wrong", {
    ...(isDev && { stack: err.stack }),
  });
};

export default errorHandler;
