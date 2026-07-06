// frontend/src/App.jsx

import { useEffect, useState } from "react";
import "./App.css";

// Backend base URL
const API_URL = "http://localhost:5000";

function App() {
  // --------------------------------------------
  // State for the new habit input
  // --------------------------------------------
  const [habitName, setHabitName] = useState("");

  // State for all habits returned by GET /habits
  const [habits, setHabits] = useState([]);

  // Object that stores check-in arrays by habit id
  // Example:
  // {
  //   1: ["2026-07-06", "2026-07-05"],
  //   2: ["2026-07-06"]
  // }
  const [checkinsByHabit, setCheckinsByHabit] = useState({});

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------
  // Helper: format Date object as YYYY-MM-DD
  // --------------------------------------------
  const formatDate = (dateObj) => {
    return dateObj.toISOString().slice(0, 10);
  };

  // --------------------------------------------
  // Helper: get last 7 calendar days including today
  // Used to display the history row for each habit
  // --------------------------------------------
  const getLast7Days = () => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      days.push({
        fullDate: formatDate(date), // example: 2026-07-06
        dayNumber: date.getDate(),  // example: 6
      });
    }

    return days;
  };

  // --------------------------------------------
  // Fetch all habits, then fetch check-ins
  // for each habit so the UI can show the
  // last 7 days history row
  // --------------------------------------------
  const fetchHabitsAndCheckins = async () => {
    try {
      setLoading(true);
      setError("");

      // Step 1: fetch habits
      const habitsResponse = await fetch(`${API_URL}/habits`);
      const habitsData = await habitsResponse.json();

      if (!habitsResponse.ok) {
        throw new Error(habitsData.error || "Failed to fetch habits");
      }

      // Step 2: fetch check-ins for each habit
      const nextCheckinsByHabit = {};

      for (const habit of habitsData) {
        const checkinsResponse = await fetch(
          `${API_URL}/habits/${habit.id}/checkins`
        );
        const checkinsData = await checkinsResponse.json();

        if (!checkinsResponse.ok) {
          throw new Error(checkinsData.error || "Failed to fetch check-ins");
        }

        nextCheckinsByHabit[habit.id] = checkinsData;
      }

      // Update state only after all data is ready
      setHabits(habitsData);
      setCheckinsByHabit(nextCheckinsByHabit);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------
  // Load habits on first page render
  // --------------------------------------------
  useEffect(() => {
    fetchHabitsAndCheckins();
  }, []);

  // --------------------------------------------
  // Add a new habit
  // POST /habits
  // --------------------------------------------
  const handleAddHabit = async () => {
    const trimmedName = habitName.trim();

    if (!trimmedName) {
      setError("Please enter a habit name");
      return;
    }

    try {
      setError("");

      const response = await fetch(`${API_URL}/habits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: trimmedName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add habit");
      }

      // Clear input after successful creation
      setHabitName("");

      // Refresh full UI data
      await fetchHabitsAndCheckins();
    } catch (err) {
      setError(err.message || "Failed to add habit");
    }
  };

  // --------------------------------------------
  // Allow Enter key to add habit quickly
  // --------------------------------------------
  const handleInputKeyDown = async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await handleAddHabit();
    }
  };

  // --------------------------------------------
  // Check in a habit for today
  // POST /habits/:id/checkin
  // --------------------------------------------
  const handleCheckIn = async (habitId) => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/habits/${habitId}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        // Empty body means backend will use today's date
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check in");
      }

      // Refresh habits + check-ins so streak/history update immediately
      await fetchHabitsAndCheckins();
    } catch (err) {
      setError(err.message || "Failed to check in");
    }
  };

  // --------------------------------------------
  // Delete a habit
  // DELETE /habits/:id
  // --------------------------------------------
  const handleDeleteHabit = async (habitId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this habit?"
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(`${API_URL}/habits/${habitId}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete habit");
      }

      await fetchHabitsAndCheckins();
    } catch (err) {
      setError(err.message || "Failed to delete habit");
    }
  };

  // Today's date in YYYY-MM-DD format
  const todayString = formatDate(new Date());

  // Last 7 days to show in every habit card
  const last7Days = getLast7Days();

  return (
    <div className="app">
      <h1>🔥 Habit Tracker</h1>

      {/* --------------------------------------------
          Add habit card
      --------------------------------------------- */}
      <div className="habit-card new-habit-card">
        <h2>Add New Habit</h2>

        <div className="new-habit-row">
          <input
            type="text"
            placeholder="Enter a habit, e.g. Drink Water"
            value={habitName}
            onChange={(e) => setHabitName(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />

          <button onClick={handleAddHabit}>Add Habit</button>
        </div>

        {/* Show frontend or API errors */}
        {error && <p className="error-text">{error}</p>}
      </div>

      {/* --------------------------------------------
          Habit list section
      --------------------------------------------- */}
      <div className="habits-section">
        {loading ? (
          <p className="status-text">Loading habits...</p>
        ) : habits.length === 0 ? (
          <p className="status-text">No habits yet. Add your first habit above.</p>
        ) : (
          habits.map((habit) => {
            const habitCheckins = checkinsByHabit[habit.id] || [];

            // If today's date already exists in this habit's check-ins,
            // disable the Check In button
            const checkedInToday = habitCheckins.includes(todayString);

            return (
              <div className="habit-card" key={habit.id}>
                {/* Habit name */}
                <h3>{habit.name}</h3>

                {/* Streak */}
                {habit.streak > 0 ? (
                  <p className="streak-text active-streak">
                    🔥 {habit.streak} day streak
                  </p>
                ) : (
                  <p className="streak-text">No streak yet — check in today!</p>
                )}

                {/* Check In button */}
                <button
                  className="checkin-button"
                  onClick={() => handleCheckIn(habit.id)}
                  disabled={checkedInToday}
                >
                  {checkedInToday ? "✅ Checked in today" : "Check In"}
                </button>

                {/* Last 7 days history row */}
                <div className="history-row">
                  {last7Days.map((day) => {
                    const done = habitCheckins.includes(day.fullDate);

                    return (
                      <div
                        key={day.fullDate}
                        className={`day-box ${done ? "done" : "not-done"}`}
                        title={day.fullDate}
                      >
                        {day.dayNumber}
                      </div>
                    );
                  })}
                </div>

                {/* Delete habit button */}
                <button
                  className="delete-button"
                  onClick={() => handleDeleteHabit(habit.id)}
                >
                  Delete Habit
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;