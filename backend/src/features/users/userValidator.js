import * as yup from "yup";
import { USER_ROLES } from "./userModel.js";

export const loginSchema = yup.object({
  username: yup.string().trim().required("Username is required"),
  password: yup.string().required("Password is required"),
});

export const createUserSchema = yup.object({
  name: yup.string().trim().required("Name is required"),
  username: yup
    .string()
    .trim()
    .lowercase()
    .matches(/^[a-z0-9._-]+$/, "Use letters, numbers, dot, dash or underscore only")
    .required("Username is required"),
  email: yup.string().trim().email("Enter a valid email").nullable().default(null),
  password: yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
  role: yup.string().oneOf(USER_ROLES).default("cashier"),
  isActive: yup.boolean().default(true),
});

export const updateUserSchema = yup.object({
  name: yup.string().trim(),
  email: yup.string().trim().email("Enter a valid email").nullable(),
  role: yup.string().oneOf(USER_ROLES),
  isActive: yup.boolean(),
  /** Optional here: an admin resetting someone's password does it in this form. */
  password: yup.string().min(6, "Password must be at least 6 characters").nullable(),
});

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required("Enter your current password"),
  newPassword: yup.string().min(6, "Password must be at least 6 characters").required("Enter a new password"),
});
