import express from "express";
import * as controller from "./printController.js";
import { printJobSchema } from "./printValidator.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const printRouter = express.Router();

printRouter.use(authMiddleware);

printRouter.get("/printers", controller.getPrinters);
printRouter.post("/", validate(printJobSchema), controller.print);

export default printRouter;
