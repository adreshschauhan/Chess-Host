import { Router } from "express";
import { healthRouter } from "./health";
import { playersRouter } from "./players";
import { statsRouter } from "./stats";
import { tournamentsRouter } from "./tournaments";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(playersRouter);
apiRouter.use(statsRouter);
apiRouter.use(tournamentsRouter);
