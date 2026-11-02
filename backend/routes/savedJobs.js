const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth, requireRole } =
    require("../middleware/authorization");

router.get(
    "/",
    requireAuth,
    requireRole("Job Seeker"),
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT j.*, s.saved_at
                 FROM saved_jobs s
                 JOIN jobs j ON j.id = s.job_id
                 WHERE s.user_id = ?
                 ORDER BY s.saved_at DESC`,
                [req.session.user.id]
            );

            res.json(rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not load saved jobs"
            });
        }
    }
);

router.post(
    "/:jobId",
    requireAuth,
    requireRole("Job Seeker"),
    async (req, res) => {
        try {
            const [jobs] = await pool.query(
                "SELECT id FROM jobs WHERE id = ?",
                [req.params.jobId]
            );

            if (!jobs.length) {
                return res.status(404).json({
                    message: "Job not found"
                });
            }

            await pool.query(
                `INSERT IGNORE INTO saved_jobs (user_id, job_id)
                 VALUES (?, ?)`,
                [req.session.user.id, req.params.jobId]
            );

            res.status(201).json({
                message: "Job saved successfully"
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not save job"
            });
        }
    }
);

router.delete(
    "/:jobId",
    requireAuth,
    requireRole("Job Seeker"),
    async (req, res) => {
        try {
            await pool.query(
                "DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?",
                [req.session.user.id, req.params.jobId]
            );

            res.json({
                message: "Saved job removed"
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not remove saved job"
            });
        }
    }
);

module.exports = router;