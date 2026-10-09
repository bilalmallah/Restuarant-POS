import express from "express";
import * as controller from "./userController.js";
import {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from "./userValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";

const userRouter = express.Router();

userRouter.post("/login", validate(loginSchema), controller.login);

userRouter.get("/me", authMiddleware, controller.getMe);
userRouter.patch(
  "/me/password",
  authMiddleware,
  validate(changePasswordSchema),
  controller.changeMyPassword
);

userRouter.use(authMiddleware, requireRole("admin"));

userRouter.get("/", controller.listUsers);
userRouter.post("/", validate(createUserSchema), controller.createUser);
userRouter.put("/:id", validate(updateUserSchema), controller.updateUser);
userRouter.delete("/:id", controller.deleteUser);

export default userRouter;
