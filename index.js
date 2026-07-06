// backend/index.js

// Import required packages
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

// Create the Express app
const app = express();
const PORT = 5000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Connect to SQLite database
// This creates data.db automatically if it does not exist
const db = new Database("data.db");

// --------------------------------------------------
// Create tables if they do not already exist
// --------------------------------------------------

// habits table:
// Stores each habit created by the user
db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

// checkins table:
// Stores one check-in per habit per date
// UNIQUE(habit_id, date) prevents duplicate check-ins on the same day
db.exec(`
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    UNIQUE(habit_id, date),
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
  )
`);

// --------------------------------------------------
// Helper function: format a Date object as YYYY-MM-DD
// --------------------------------------------------
function formatDate(dateObj) {
  return dateObj.toISOString().slice(0, 10);
}

// --------------------------------------------------
// Helper function: calculate current streak for a habit
//
// Logic:
// 1. Get all check-in dates for the habit
// 2. Start from today if checked in today
// 3. Otherwise start from yesterday if checked in yesterday
// 4. Count backward day-by-day until a date is missing
// --------------------------------------------------
function calculateStreak(habitId) {
  const rows = db
    .prepare(
      `
      SELECT date
      FROM checkins
      WHERE habit_id = ?
      ORDER BY date DESC
      `
    )
    .all(habitId);

  const dateSet = new Set(rows.map((row) => row.date));

  const today = new Date();
  const todayStr = formatDate(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  let currentDate;

  // If checked in today, streak can start from today
  if (dateSet.has(todayStr)) {
    currentDate = new Date(today);
  }
  // If not checked in today, but checked in yesterday,
  // streak can start from yesterday
  else if (dateSet.has(yesterdayStr)) {
    currentDate = new Date(yesterday);
  }
  // Otherwise streak is 0
  else {
    return 0;
  }

  let streak = 0;

  while (true) {
    const currentDateStr = formatDate(currentDate);

    if (!dateSet.has(currentDateStr)) {
      break;
    }

    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

// --------------------------------------------------
// POST /habits
// Create a new habit
// Request body:
// {
//   "name": "Drink Water"
// }
// --------------------------------------------------
app.post("/habits", (req, res) => {
  try {
    const name = req.body?.name?.trim();

    // Validate name
    if (!name) {
      return res.status(400).json({
        error: "Habit name is required"
      });
    }

    const createdAt = new Date().toISOString();

    const result = db
      .prepare(
        `
        INSERT INTO habits (name, created_at)
        VALUES (?, ?)
        `
      )
      .run(name, createdAt);

    const newHabit = db
      .prepare("SELECT * FROM habits WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({
      ...newHabit,
      streak: 0
    });
  } catch (error) {
    console.error("POST /habits error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// --------------------------------------------------
// GET /habits
// Return all habits with their streaks
// --------------------------------------------------
app.get("/habits", (req, res) => {
  try {
    const habits = db
      .prepare(
        `
        SELECT *
        FROM habits
        ORDER BY datetime(created_at) DESC
        `
      )
      .all();

    const habitsWithStreaks = habits.map((habit) => ({
      ...habit,
      streak: calculateStreak(habit.id)
    }));

    res.json(habitsWithStreaks);
  } catch (error) {
    console.error("GET /habits error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// --------------------------------------------------
// POST /habits/:id/checkin
// Add a check-in for a habit
//
// Request body can be either:
// {}                         -> defaults to today
// { "date": "2026-07-06" }   -> check in for a specific date
// --------------------------------------------------
app.post("/habits/:id/checkin", (req, res) => {
  try {
    const habitId = Number(req.params.id);

    if (Number.isNaN(habitId)) {
      return res.status(400).json({
        error: "Invalid habit id"
      });
    }

    // Check whether the habit exists
    const habit = db.prepare("SELECT * FROM habits WHERE id = ?").get(habitId);

    if (!habit) {
      return res.status(404).json({
        error: "Habit not found"
      });
    }

    // Use the provided date if available, otherwise today's date
    const date = req.body?.date ? String(req.body.date).trim() : formatDate(new Date());

    // Very simple date format validation for YYYY-MM-DD
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      return res.status(400).json({
        error: "Date must be in YYYY-MM-DD format"
      });
    }

    const checkedAt = new Date().toISOString();

    const result = db
      .prepare(
        `
        INSERT INTO checkins (habit_id, date, checked_at)
        VALUES (?, ?, ?)
        `
      )
      .run(habitId, date, checkedAt);

    const newCheckin = db
      .prepare("SELECT * FROM checkins WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({
      ...newCheckin,
      streak: calculateStreak(habitId)
    });
  } catch (error) {
    // UNIQUE constraint error means same habit already checked in on that date
    if (
      error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      (typeof error.message === "string" &&
        error.message.toLowerCase().includes("unique"))
    ) {
      return res.status(409).json({
        error: "Already checked in for this date"
      });
    }

    console.error("POST /habits/:id/checkin error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// --------------------------------------------------
// GET /habits/:id/checkins
// Return all check-in dates for a habit
// Example response:
// ["2026-07-06", "2026-07-05", "2026-07-04"]
// --------------------------------------------------
app.get("/habits/:id/checkins", (req, res) => {
  try {
    const habitId = Number(req.params.id);

    if (Number.isNaN(habitId)) {
      return res.status(400).json({
        error: "Invalid habit id"
      });
    }

    // Check whether habit exists
    const habit = db.prepare("SELECT * FROM habits WHERE id = ?").get(habitId);

    if (!habit) {
      return res.status(404).json({
        error: "Habit not found"
      });
    }

    const rows = db
      .prepare(
        `
        SELECT date
        FROM checkins
        WHERE habit_id = ?
        ORDER BY date DESC
        `
      )
      .all(habitId);

    const dates = rows.map((row) => row.date);

    res.json(dates);
  } catch (error) {
    console.error("GET /habits/:id/checkins error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// --------------------------------------------------
// DELETE /habits/:id/checkin/:date
// Remove one check-in for a habit on a specific date
// --------------------------------------------------
app.delete("/habits/:id/checkin/:date", (req, res) => {
  try {
    const habitId = Number(req.params.id);
    const { date } = req.params;

    if (Number.isNaN(habitId)) {
      return res.status(400).json({
        error: "Invalid habit id"
      });
    }

    // Check whether habit exists
    const habit = db.prepare("SELECT * FROM habits WHERE id = ?").get(habitId);

    if (!habit) {
      return res.status(404).json({
        error: "Habit not found"
      });
    }

    const result = db
      .prepare(
        `
        DELETE FROM checkins
        WHERE habit_id = ? AND date = ?
        `
      )
      .run(habitId, date);

    // If no row was deleted, the check-in did not exist
    if (result.changes === 0) {
      return res.status(404).json({
        error: "Check-in not found for this date"
      });
    }

    res.json({
      message: "Check-in removed successfully"
    });
  } catch (error) {
    console.error("DELETE /habits/:id/checkin/:date error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// --------------------------------------------------
// DELETE /habits/:id
// Delete a habit and all its check-ins
// --------------------------------------------------
app.delete("/habits/:id", (req, res) => {
  try {
    const habitId = Number(req.params.id);

    if (Number.isNaN(habitId)) {
      return res.status(400).json({
        error: "Invalid habit id"
      });
    }

    // Check whether habit exists
    const habit = db.prepare("SELECT * FROM habits WHERE id = ?").get(habitId);

    if (!habit) {
      return res.status(404).json({
        error: "Habit not found"
      });
    }

    // Delete all check-ins first
    db.prepare("DELETE FROM checkins WHERE habit_id = ?").run(habitId);

    // Delete the habit
    db.prepare("DELETE FROM habits WHERE id = ?").run(habitId);

    res.json({
      message: "Habit deleted successfully"
    });
  } catch (error) {
    console.error("DELETE /habits/:id error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// --------------------------------------------------
// Start the server
// --------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});