const express = require("express");
const db = require("./db");

const router = express.Router();

router.post("/register", (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    [username, email, password],
    function (err) {
      if (err) {
        console.error("Register error:", err.message);
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: "user created" });
      }
    },
  );
});

router.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, row) => {
      if (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ error: err.message });
      } else if (row) {
        res.json({ message: "successful login", user: row });
      } else {
        res.status(401).json({ message: "invalid credentials" });
      }
    },
  );
});

router.post("/logout", (req, res) => {
  res.json({ message: "logout" });
});

router.post("/llm/infer", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3:8b", prompt, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    res.json({ output: data.response });
  } catch (error) {
    console.error("LLM inference error:", error.message);
    res.status(500).json({
      error: "Failed to connect to Ollama. Make sure Ollama is running.",
    });
  }
});

router.post("/reviews", (req, res) => {
  const { author, rating, text } = req.body;

  if (!author || !rating || !text) {
    return res.status(400).json({ error: "author, rating, text are required" });
  }

  db.run(
    "INSERT INTO reviews (author, rating, text) VALUES (?, ?, ?)",
    [author, rating, text],
    function (err) {
      if (err) {
        console.error("Create review error:", err.message);
        return res.status(500).json({ error: "Unable to save review" });
      }
      res.json({ id: this.lastID, author, rating, text });
    },
  );
});

router.get("/reviews", (req, res) => {
  db.all(
    "SELECT id, author, rating, text, created_at FROM reviews ORDER BY created_at DESC LIMIT 20",
    [],
    (err, rows) => {
      if (err) {
        console.error("Fetch reviews error:", err.message);
        return res.status(500).json({ error: "Unable to fetch reviews" });
      }
      res.json({ reviews: rows });
    },
  );
});

module.exports = router;
