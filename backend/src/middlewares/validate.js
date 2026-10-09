import createError from "http-errors";

export const validate = (schema) => async (req, _res, next) => {
  try {
    req.body = await schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    next();
  } catch (error) {
    const message = error?.errors?.[0] || "Invalid input";
    next(createError(400, `Validation Error: ${message}`));
  }
};
