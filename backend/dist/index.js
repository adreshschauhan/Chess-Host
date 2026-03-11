"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./env");
const routes_1 = require("./routes");
const error_1 = require("./middleware/error");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
app.get("/", (_req, res) => res.redirect("/api/health"));
app.use("/api", routes_1.apiRouter);
app.use(error_1.errorHandler);
app.listen(env_1.env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on :${env_1.env.PORT}`);
});
