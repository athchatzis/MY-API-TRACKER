const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: "chrome-extension://hblhlabfiekdhncmjbaeiefcmfdamnch",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

// Ανοίγει τη βάση ή τη δημιουργεί αν δεν υπάρχει.
// Το αρχείο αποθηκεύεται δίπλα στο συγκεκριμένο script.
const db = new Database(path.join(__dirname, "sessions.db"));

// Δημιουργεί τον πίνακα μόνο αν δεν υπάρχει ήδη.
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    hours_coding REAL NOT NULL
  )
`);

// Για το ίδιο id, αντικαθιστά ημερομηνία και χρόνο.
// Δεν κρατά ιστορικό προηγούμενων ημερών.
const saveSession = db.prepare(`
  INSERT INTO sessions (id, date, hours_coding)
  VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    date = excluded.date,
    hours_coding = excluded.hours_coding
`);

const getSession = db.prepare(`
  SELECT date, hours_coding
  FROM sessions
  WHERE id = ?
`);

app.post("/session/:id", (req, res) => {
  const { id } = req.params;
  const { hours_coding } = req.body ?? {};

  if (hours_coding === undefined) {
    return res.status(400).send({
      message: "hours_coding is required!",
    });
  }

  if (!Number.isFinite(hours_coding) || hours_coding < 0) {
    return res.status(400).send({
      message: "hours_coding must be a non-negative number!",
    });
  }

  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join(":");

  // Αποθήκευση στη βάση.
  saveSession.run(id, date, hours_coding);

  res.status(200).send({
    date,
    hours_coding,
  });
  console.log(`Data Has been updated!`);
});

app.get("/session/:id", (req, res) => {
  const { id } = req.params;

  // Ανάγνωση από τη βάση.
  const session = getSession.get(id);

  if (!session) {
    return res.status(404).send({
      message: "Session not found!",
    });
  }

  res.status(200).send(session);
});

app.listen(PORT, () => {
  console.log(`It's alive on: http://localhost:${PORT}`);
});
