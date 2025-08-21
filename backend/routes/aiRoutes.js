// backend/routes/aiRoutes.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Ollama config (same as config.py)
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL_NAME = "llama3.2:1b";
const MAX_TOKENS = -1;
const STREAM = true;

router.post("/", authMiddleware, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt cannot be empty" });
  }

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: STREAM,
        options: { num_predict: MAX_TOKENS },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Ollama error: ${errText}` });
    }

    // Streaming headers so frontend gets tokens live
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.response) {
            // Send each token as JSON line
            res.write(JSON.stringify({ token: obj.response }) + "\n");
          }
          if (obj.done) {
            res.write(JSON.stringify({ done: true }) + "\n");
            res.end();
            return;
          }
        } catch (err) {
          // ignore bad JSON
        }
      }
    }
  } catch (err) {
    console.error("AI request failed:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

module.exports = router;
