import { Router } from "express";
import { giantKillers, winningStreaks } from "../services/stats";

export const statsRouter = Router();

statsRouter.get("/stats/winning-streaks", async (_req, res, next) => {
  try {
    res.json(await winningStreaks());
  } catch (e) {
    next(e);
  }
});

statsRouter.get("/stats/giant-killers", async (_req, res, next) => {
  try {
    res.json(await giantKillers());
  } catch (e) {
    next(e);
  }
});
