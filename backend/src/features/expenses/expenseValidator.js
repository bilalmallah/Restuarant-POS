import * as yup from "yup";

export const expenseSchema = yup.object({
  entryDate: yup.date().required("Choose a date"),
  category: yup.string().trim().required("Choose a category"),
  title: yup.string().trim().required("What was this expense for?"),
  amount: yup.number().moreThan(0, "Amount must be more than zero").required("Enter an amount"),
  paidTo: yup.string().trim().nullable().default(null),
  paymentMethod: yup.string().trim().default("cash"),
  billNumber: yup.string().trim().nullable().default(null),
  note: yup.string().trim().nullable().default(null),
});
