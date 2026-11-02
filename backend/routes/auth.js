const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const db = require("../db");

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Please fill in all required fields."
      });
    }

    if (!["Job Seeker", "Recruiter"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name.trim(), normalizedEmail, hashedPassword, role]
    );

    return res.status(201).json({
      message: "Registration successful.",
      user: {
        id: result.insertId,
        name: name.trim(),
        email: normalizedEmail,
        role
      }
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    return res.status(500).json({
      message: "Registration failed. Please try again."
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await db.query(
      "SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Regenerate session ID after successful authentication.
    req.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error("Session error:", sessionError.message);

        return res.status(500).json({
          message: "Could not create a login session."
        });
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError.message);

          return res.status(500).json({
            message: "Could not save the login session."
          });
        }

        return res.status(200).json({
          message: "Login successful.",
          user: req.session.user
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }
});

// Get current logged-in user
router.get("/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      message: "Not logged in."
    });
  }

  return res.status(200).json({
    user: req.session.user
  });
});

// Logout
router.post("/logout", (req, res) => {
  if (!req.session) {
    return res.status(200).json({
      message: "Logged out successfully."
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);

      return res.status(500).json({
        message: "Logout failed."
      });
    }

    res.clearCookie("jobportal.sid");

    return res.status(200).json({
      message: "Logged out successfully."
    });
  });
});

module.exports = router;