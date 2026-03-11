import express from "express";
import cors from "cors";
import { env } from "./env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/error";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.redirect("/api/health"));
app.use("/api", apiRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on :${env.PORT}`);
});
