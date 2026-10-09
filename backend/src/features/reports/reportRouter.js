import express from "express";
import * as controller from "./reportController.js";
import { authMiddleware, requireRole } from "../../middlewares/authMiddleware.js";

const reportRouter = express.Router();

reportRouter.use(authMiddleware);

/** The dashboard is the landing page for everyone, including cashiers. */
reportRouter.get("/dashboard", controller.getDashboard);

reportRouter.use(requireRole("admin", "manager"));

reportRouter.get("/sales", controller.getSalesSummary);
reportRouter.get("/products", controller.getProductSales);
reportRouter.get("/day-book", controller.getDayBook);
reportRouter.get("/waiters", controller.getWaiterReport);

export default reportRouter;
