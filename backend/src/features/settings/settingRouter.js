import express from "express";
import * as controller from "./settingController.js";
import { settingsSchema } from "./settingValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";

const settingRouter = express.Router();

/** Unauthenticated: the login screen needs the restaurant name before any token exists. */
settingRouter.get("/branding", controller.getBranding);

settingRouter.get("/", authMiddleware, controller.getAllSettings);
settingRouter.put(
  "/",
  authMiddleware,
  requireRole("admin", "manager"),
  validate(settingsSchema),
  controller.updateSettings
);

export default settingRouter;
