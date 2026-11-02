const express = require("express");
const router = express.Router();
const db = require("../db");

// Check logged-in user
function requireLogin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  next();
}

// Check recruiter role
function requireRecruiter(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  if (req.session.user.role !== "Recruiter") {
    return res.status(403).json({
      message: "Only recruiters can perform this action.",
    });
  }

  next();
}

// GET: Everyone can browse all jobs
router.get("/", async (req, res) => {
  try {
    const [jobs] = await db.query(
      "SELECT * FROM jobs ORDER BY created_at DESC"
    );

    res.json(jobs);
  } catch (error) {
    console.error("Fetch jobs error:", error.message);
    res.status(500).json({
      message: "Failed to fetch jobs.",
    });
  }
});

// GET: Recruiter can view only their own jobs
router.get("/mine", requireRecruiter, async (req, res) => {
  try {
    const [jobs] = await db.query(
      `SELECT * FROM jobs
       WHERE recruiter_id = ?
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );

    res.json(jobs);
  } catch (error) {
    console.error("Fetch recruiter jobs error:", error.message);
    res.status(500).json({
      message: "Failed to fetch your jobs.",
    });
  }
});

// POST: Recruiter creates a job
router.post("/", requireRecruiter, async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      salary,
      job_type,
      description,
    } = req.body;

    if (!title?.trim() || !company?.trim() || !location?.trim()) {
      return res.status(400).json({
        message: "Title, company, and location are required.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO jobs
       (title, company, location, salary, job_type, description, recruiter_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        company.trim(),
        location.trim(),
        salary?.trim() || null,
        job_type?.trim() || null,
        description?.trim() || null,
        req.session.user.id,
      ]
    );

    res.status(201).json({
      message: "Job created successfully.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Create job error:", error.message);
    res.status(500).json({
      message: "Failed to create job.",
    });
  }
});

// PUT: Recruiter edits their own job
router.put("/:id", requireRecruiter, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Invalid job ID.",
      });
    }

    const {
      title,
      company,
      location,
      salary,
      job_type,
      description,
    } = req.body;

    if (!title?.trim() || !company?.trim() || !location?.trim()) {
      return res.status(400).json({
        message: "Title, company, and location are required.",
      });
    }

    const [result] = await db.query(
      `UPDATE jobs
       SET title = ?,
           company = ?,
           location = ?,
           salary = ?,
           job_type = ?,
           description = ?
       WHERE id = ? AND recruiter_id = ?`,
      [
        title.trim(),
        company.trim(),
        location.trim(),
        salary?.trim() || null,
        job_type?.trim() || null,
        description?.trim() || null,
        id,
        req.session.user.id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Job not found or you do not own this job.",
      });
    }

    res.json({
      message: "Job updated successfully.",
    });
  } catch (error) {
    console.error("Update job error:", error.message);
    res.status(500).json({
      message: "Failed to update job.",
    });
  }
});

// DELETE: Recruiter deletes only their own job
router.delete("/:id", requireRecruiter, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        message: "Invalid job ID.",
      });
    }

    const [result] = await db.query(
      "DELETE FROM jobs WHERE id = ? AND recruiter_id = ?",
      [id, req.session.user.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Job not found or you do not own this job.",
      });
    }

    res.json({
      message: "Job deleted successfully.",
    });
  } catch (error) {
    console.error("Delete job error:", error.message);
    res.status(500).json({
      message: "Failed to delete job.",
    });
  }
});

module.exports = router;