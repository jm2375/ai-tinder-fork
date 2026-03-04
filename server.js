// server.js
// Express backend for AI Tinder — tracks Like, Nope, Super Like decisions.

const express = require("express");
const cors    = require("cors");
const path    = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend (index.html, app.js, styles.css, etc.) from the project root
app.use(express.static(path.join(__dirname)));

// ─── In-memory store ────────────────────────────────────────────────────────
// Each entry: { profileId, profile, timestamp }
const store = {
  liked:      [],
  rejected:   [],
  superLiked: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStats() {
  return {
    liked:      store.liked.length,
    rejected:   store.rejected.length,
    superLiked: store.superLiked.length,
    total:      store.liked.length + store.rejected.length + store.superLiked.length,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// POST /api/decision
// Body: { profileId: string, decision: "like"|"nope"|"superlike", profile?: object }
// Returns: { success, decision, matched, stats }
app.post("/api/decision", (req, res) => {
  const { profileId, decision, profile } = req.body;

  if (!profileId || typeof profileId !== "string") {
    return res.status(400).json({ error: "profileId (string) is required" });
  }

  const valid = ["like", "nope", "superlike"];
  if (!valid.includes(decision)) {
    return res.status(400).json({
      error: `decision must be one of: ${valid.join(", ")}`,
    });
  }

  const entry = {
    profileId,
    profile: profile ?? null,
    timestamp: Date.now(),
  };

  let matched = false;

  if (decision === "like") {
    store.liked.push(entry);
    matched = Math.random() < 0.3; // 30% match chance
  } else if (decision === "nope") {
    store.rejected.push(entry);
  } else if (decision === "superlike") {
    store.superLiked.push(entry);
    matched = true; // super like always matches
  }

  return res.json({
    success: true,
    decision,
    matched,
    stats: getStats(),
  });
});

// GET /api/decisions
// Returns full decision lists (liked, rejected, superLiked)
app.get("/api/decisions", (_req, res) => {
  res.json(store);
});

// GET /api/decisions/stats
// Returns just the counts
app.get("/api/decisions/stats", (_req, res) => {
  res.json(getStats());
});

// DELETE /api/decisions
// Resets the store (useful for testing / new deck)
app.delete("/api/decisions", (_req, res) => {
  store.liked      = [];
  store.rejected   = [];
  store.superLiked = [];
  res.json({ success: true, message: "Decision history cleared." });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🔥 AI Tinder backend running at http://localhost:${PORT}`);
  console.log("   Endpoints:");
  console.log("     GET    /api/health");
  console.log("     POST   /api/decision");
  console.log("     GET    /api/decisions");
  console.log("     GET    /api/decisions/stats");
  console.log("     DELETE /api/decisions\n");
});
