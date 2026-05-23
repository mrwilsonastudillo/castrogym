import "./utils/env"; // load .env first
import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./utils/env";

import authRouter from "./routes/auth";
import clientesRouter from "./routes/clientes";
import coachesRouter from "./routes/coaches";
import citasRouter from "./routes/citas";
import medicionesRouter from "./routes/mediciones";
import reportesRouter from "./routes/reportes";
import adminRouter from "./routes/admin";
import membresiasRouter from "./routes/membresias";
import contenidoRouter from "./routes/contenido";
import planesRouter from "./routes/planes";
import { startWorkers } from "./services/workers";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/clientes", clientesRouter);
app.use("/api/coaches", coachesRouter);
app.use("/api/citas", citasRouter);
app.use("/api/mediciones", medicionesRouter);
app.use("/api/reportes", reportesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/membresias", membresiasRouter);
app.use("/api/contenido", contenidoRouter);
app.use("/api/planes", planesRouter);

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

app.listen(env.PORT, () => {
  console.log(`🏋️  Castro Gym API corriendo en http://localhost:${env.PORT}`);
  startWorkers();
});
