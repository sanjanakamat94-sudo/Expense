# 💰 Expense Tracker

A full-stack Expense Tracker application built with **React (Vite)**, **Node.js (Express)**, **SQLite (better-sqlite3)**, and **CORS**. The application allows users to add, view, filter, summarize, update, and delete daily expenses through a clean and responsive interface.

---

## 🚀 Features

- ➕ Add new expenses
- 📋 View all expenses
- 🔍 Filter expenses by category
- 📅 Filter monthly records
- 📊 Monthly expense summary by category
- 📄 Pagination support
- ✏️ Update existing expenses
- ❌ Delete expenses
- 💾 SQLite database for persistent storage
- 🌐 RESTful API backend
- ⚛️ React frontend with Hooks

---

## 🛠️ Technologies Used

### Frontend
- React
- Vite
- CSS3
- Fetch API

### Backend
- Node.js
- Express.js
- better-sqlite3
- CORS

### Database
- SQLite (`data.db`)

---

## 📁 Project Structure

```
project/
│
├── backend/
│   ├── index.js
│   ├── package.json
│   └── data.db
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── App.css
    │   └── main.jsx
    └── package.json
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd expense-tracker
```

---

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

---

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## ▶️ Run the Application

### Start Backend

```bash
cd backend
node index.js
```

Backend runs on

```
http://localhost:5000
```

---

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on

```
http://localhost:5173
```

---

## 📌 API Endpoints

### Add Expense

**POST**

```
/expenses
```

Request Body

```json
{
  "title": "Groceries",
  "amount": 450.5,
  "category": "Food",
  "date": "2026-07-06"
}
```

---

### Get Expenses

**GET**

```
/expenses
```

Optional Query Parameters

| Parameter | Description |
|-----------|-------------|
| page | Page number |
| limit | Records per page |
| category | Filter by category |
| month | Filter by month (YYYY-MM) |

Example

```
/expenses?page=1&limit=10&category=Food&month=2026-07
```

---

### Monthly Summary

**GET**

```
/expenses/summary
```

Example

```
/expenses/summary?month=2026-07
```

---

### Update Expense

**PUT**

```
/expenses/:id
```

---

### Delete Expense

**DELETE**

```
/expenses/:id
```

---

## 🗄️ Database Schema

### expenses

| Column | Type |
|---------|------|
| id | INTEGER PRIMARY KEY AUTOINCREMENT |
| title | TEXT |
| amount | REAL |
| category | TEXT |
| date | TEXT |
| created_at | TEXT |

---

## 📸 Application Modules

- Add Expense Form
- Monthly Summary Dashboard
- Expense List
- Category Filter
- Pagination Controls
- Delete Expense

---

## 💡 Future Improvements

- Edit expense from UI
- Expense search
- Charts and graphs
- Export expenses to Excel/PDF
- User authentication
- Budget tracking
- Dark mode

---

## 👨‍💻 Author

Developed as a Full-Stack CRUD application using React, Express, and SQLite.

---

## 📄 License

This project is developed for educational and learning purposes.
