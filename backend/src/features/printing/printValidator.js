import * as yup from "yup";

export const printJobSchema = yup.object({
  /**
   * Which configured printer to use. The names themselves live in settings, so
   * the browser never has to know what hardware is attached.
   */
  target: yup.string().oneOf(["receipt", "kitchen"]).default("receipt"),
  /** Explicit override, used by the Test Print button in Settings. */
  printerName: yup.string().trim().nullable().default(null),
  text: yup.string().required("Nothing to print"),
  label: yup.string().trim().nullable().default(null),
});
