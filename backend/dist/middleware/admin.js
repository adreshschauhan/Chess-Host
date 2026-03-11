"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const env_1 = require("../env");
const requireAdmin = (req, res, next) => {
    const token = req.header("x-admin-token");
    if (!token || token !== env_1.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};
exports.requireAdmin = requireAdmin;
