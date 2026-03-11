"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRouter = void 0;
const express_1 = require("express");
const stats_1 = require("../services/stats");
exports.statsRouter = (0, express_1.Router)();
exports.statsRouter.get("/stats/winning-streaks", async (_req, res, next) => {
    try {
        res.json(await (0, stats_1.winningStreaks)());
    }
    catch (e) {
        next(e);
    }
});
exports.statsRouter.get("/stats/giant-killers", async (_req, res, next) => {
    try {
        res.json(await (0, stats_1.giantKillers)());
    }
    catch (e) {
        next(e);
    }
});
