import type { RequestHandler } from "express";
import { env } from "../env";

export const requireAdmin: RequestHandler = (req, res, next) => {
  const token = req.header("x-admin-token");
  if (!token || token !== env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
