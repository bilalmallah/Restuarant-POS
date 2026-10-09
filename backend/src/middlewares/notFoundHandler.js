import createError from "http-errors";

const notFoundHandler = (req, _res, next) =>
  next(createError(404, `Route ${req.originalUrl} not found`));

export default notFoundHandler;
