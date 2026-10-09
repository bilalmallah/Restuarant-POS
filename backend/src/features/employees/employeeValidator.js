import * as yup from "yup";
import { EMPLOYEE_ROLES, PAY_TYPES } from "./employeeModel.js";

export const employeeSchema = yup.object({
  name: yup.string().trim().required("Employee name is required"),
  phone: yup.string().trim().nullable().default(null),
  cnic: yup.string().trim().nullable().default(null),
  role: yup.string().oneOf(EMPLOYEE_ROLES).default("waiter"),

  payType: yup.string().oneOf(PAY_TYPES, "Choose monthly, daily or commission").default("monthly"),

  /**
   * Only the field matching payType is required. Asking a commission-only waiter
   * for a monthly salary is the kind of friction that gets forms filled with
   * zeroes, so the others simply default to 0.
   */
  monthlySalary: yup
    .number()
    .min(0)
    .default(0)
    .when("payType", {
      is: "monthly",
      then: (schema) => schema.moreThan(0, "Enter the monthly salary"),
    }),
  dailyWage: yup
    .number()
    .min(0)
    .default(0)
    .when("payType", {
      is: "daily",
      then: (schema) => schema.moreThan(0, "Enter the daily wage"),
    }),
  commissionPercent: yup
    .number()
    .min(0)
    .max(100, "Commission cannot be more than 100%")
    .default(0)
    .when("payType", {
      is: "commission",
      then: (schema) => schema.moreThan(0, "Enter the commission percent"),
    }),

  isWaiter: yup.boolean().default(true),
  joiningDate: yup.date().nullable().default(null),
  isActive: yup.boolean().default(true),
  notes: yup.string().trim().nullable().default(null),
});
