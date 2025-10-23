require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// Connect to MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) console.log("MySQL error:", err);
  else console.log("Connected to MySQL");
});

// Socket.io for notifications
io.on("connection", (socket) => {
  console.log("User connected");
});

// Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err || results.length === 0)
        return res.status(401).json({ error: "Wrong email or password" });
      const user = results[0];
      if (!(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ error: "Wrong email or password" });
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET
      );
      res.json({
        token,
        user: { id: user.id, email, name: user.name, role: user.role },
      });
    }
  );
});

// Middleware to check token
const checkToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// Get all jobs
app.get("/api/jobs", (req, res) => {
  db.query("SELECT * FROM jobs", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// Post a job (recruiter only)
app.post("/api/jobs", checkToken, (req, res) => {
  if (req.user.role !== "recruiter")
    return res.status(403).json({ error: "Only recruiters can post jobs" });
  const { title, description } = req.body;
  db.query(
    "INSERT INTO jobs (title, description, recruiter_id) VALUES (?, ?, ?)",
    [title, description, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      const job = {
        id: result.insertId,
        title,
        description,
        recruiter_id: req.user.id,
      };
      io.emit("newJob", job); // Notify everyone
      res.json(job);
    }
  );
});

// Apply to a job (student only)
app.post("/api/applications", checkToken, (req, res) => {
  if (req.user.role !== "student")
    return res.status(403).json({ error: "Only students can apply" });
  const { job_id } = req.body;
  db.query(
    "INSERT INTO applications (student_id, job_id) VALUES (?, ?)",
    [req.user.id, job_id],
    (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      io.emit("newApplication", { job_id, student_id: req.user.id });
      res.json({ message: "Applied successfully" });
    }
  );
});

// Start server
server.listen(process.env.PORT, () =>
  console.log("Server running on port 5000")
);
