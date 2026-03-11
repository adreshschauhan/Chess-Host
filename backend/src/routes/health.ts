import { Router } from "express";
import { requireAdmin } from "../middleware/admin";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Lightweight endpoint for verifying an admin token from the frontend login page
healthRouter.get("/admin/verify", requireAdmin, (_req, res) => {
  res.json({ ok: true });
});
