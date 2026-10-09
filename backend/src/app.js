import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

import config from "./config/config.js";

/** Must be imported before any router, or `include` has no associations to use. */
import "./config/associations.js";

import errorHandler from "./middlewares/errorHandler.js";
import notFoundHandler from "./middlewares/notFoundHandler.js";
import serveFrontend from "./middlewares/serveFrontend.js";

import userRouter from "./features/users/userRouter.js";
import tableRouter from "./features/tables/tableRouter.js";
import categoryRouter from "./features/categories/categoryRouter.js";
import productRouter from "./features/products/productRouter.js";
import employeeRouter from "./features/employees/employeeRouter.js";
import orderRouter from "./features/orders/orderRouter.js";
import creditRouter from "./features/credit/creditRouter.js";
import expenseRouter from "./features/expenses/expenseRouter.js";
import payrollRouter from "./features/payroll/payrollRouter.js";
import kitchenRouter from "./features/kitchen/kitchenRouter.js";
import closingRouter from "./features/closings/closingRouter.js";
import reportRouter from "./features/reports/reportRouter.js";
import settingRouter from "./features/settings/settingRouter.js";
import printRouter from "./features/printing/printRouter.js";
import backupRouter from "./features/backups/backupRouter.js";

const app = express();

/* ------------------- Security ------------------- */
app.use(helmet({ contentSecurityPolicy: false }));

/* ------------------- Body parser ------------------- */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* ------------------- CORS ------------------- */
app.use(cors({ origin: config.frontendOrigin }));

/* ------------------- Rate limiting ------------------- */
/**
 * A busy Friday night is a genuinely high-traffic burst from a handful of
 * machines, so the general limit is generous; login stays tight because that
 * is the only endpoint worth guessing at.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: "Too many attempts, please try again later." },
});

app.use("/api", apiLimiter);
app.use("/api/users/login", authLimiter);

/* ------------------- Health ------------------- */
app.get("/api/health", (_req, res) =>
  res.status(200).json({ status: "ok", app: config.appName, time: new Date().toISOString() })
);

/* ------------------- Routes ------------------- */
app.use("/api/users", userRouter);
app.use("/api/settings", settingRouter);

/* POS */
app.use("/api/tables", tableRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/print", printRouter);

/* Staff */
app.use("/api/employees", employeeRouter);
app.use("/api/payroll", payrollRouter);

/* Finance */
app.use("/api/credit", creditRouter);
app.use("/api/expenses", expenseRouter);
app.use("/api/reports", reportRouter);
app.use("/api/backups", backupRouter);

/* Kitchen */
app.use("/api/kitchen", kitchenRouter);
app.use("/api/closings", closingRouter);

/* ------------------- Frontend SPA ------------------- */
app.use(serveFrontend());

/* ------------------- Catch-all ------------------- */
app.use(notFoundHandler);

/* ------------------- Global error handler ------------------- */
app.use(errorHandler);

export default app;
