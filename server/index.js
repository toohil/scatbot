import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { Chatbot, ChatLogger } from "./chatfunctions.js";

dotenv.config();
pipelines = {}
// Tiny helper so missing env vars fail loudly (instead of vague errors)
function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name} (check server/.env)`);
  return v;
}

const app = express();
// app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});


app.post("/api/session", async (_req, res) => {
  try {
    const sessionId = crypto.randomUUID();


    pipelines[sessionId] = [new Chatbot]
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

  app.post("/api/session/:sessionId/message", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, content } = req.body;

    pipelines[sessionId].getChatbotResponse(content)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save message" });
  }
});

app.get("/api/session/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/session/:sessionId/kill-session", async (req, res) => {
  try {
    const { sessionId } = req.params;
    pipelines[sessionId].killChatbot()
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to end session" });
  }
});

const PORT = 5174;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
