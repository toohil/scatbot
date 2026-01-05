import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import crypto from "crypto";


dotenv.config();

// Tiny helper so missing env vars fail loudly (instead of vague errors)
function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name} (check server/.env)`);
  return v;
}

const pool = mysql.createPool({
  host: mustGetEnv("MYSQL_HOST"),
  port: Number(mustGetEnv("MYSQL_PORT")),
  user: mustGetEnv("MYSQL_USER"),
  password: mustGetEnv("MYSQL_PASSWORD"),
  database: mustGetEnv("MYSQL_DATABASE"),
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.get("/db-check", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ db: "connected", result: rows[0].result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ db: "error", message: String(err?.message ?? err) });
  }
});
app.post("/api/session", async (_req, res) => {
  try {
    const sessionId = crypto.randomUUID();

    await pool.execute(
      `INSERT INTO sessions (session_id) VALUES (?)`,
      [sessionId]
    );

    const [rows] = await pool.execute(
      `SELECT session_id, created_at, last_seen
       FROM sessions
       WHERE session_id = ?`,
      [sessionId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

const PORT = 5174;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
