import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serveFrontend = () => {
  const router = express.Router();

  // backend/src/middlewares → ../../.. → project root → frontend/dist
  const frontendPath = path.resolve(__dirname, "../../../frontend/dist");
  const indexPath = path.join(frontendPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    console.warn("Frontend build not found:", indexPath);
    return router;
  }

  router.use(express.static(frontendPath));

  router.get(/^(?!\/api).*/, (req, res) => {
    if (req.path.includes(".")) return res.status(404).end();
    res.sendFile(indexPath);
  });

  return router;
};

export default serveFrontend;
