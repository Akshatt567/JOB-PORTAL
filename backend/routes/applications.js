const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth, requireRole } =
    require("../middleware/authorization");

// Apply for a job
router.post(
    "/",
    requireAuth,
    requireRole("Job Seeker"),
    async (req, res) => {
        try {
            const { job_id, cover_letter, resume_url } = req.body;

            if (!job_id) {
                return res.status(400).json({
                    message: "Job ID is required"
                });
            }

            const [jobs] = await pool.query(
                "SELECT id, recruiter_id, title FROM jobs WHERE id = ?",
                [job_id]
            );

            if (!jobs.length) {
                return res.status(404).json({
                    message: "Job not found"
                });
            }

            const [result] = await pool.query(
                `INSERT INTO applications
                (job_id, applicant_id, cover_letter, resume_url)
                VALUES (?, ?, ?, ?)`,
                [
                    job_id,
                    req.session.user.id,
                    cover_letter || null,
                    resume_url || null
                ]
            );

            await pool.query(
                `INSERT INTO notifications (user_id, message)
                 VALUES (?, ?)`,
                [
                    jobs[0].recruiter_id,
                    `A candidate applied for ${jobs[0].title}`
                ]
            );

            res.status(201).json({
                message: "Application submitted successfully",
                application_id: result.insertId
            });
        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    message: "You have already applied for this job"
                });
            }

            console.error(error);
            res.status(500).json({
                message: "Could not submit application"
            });
        }
    }
);

// View your applications
router.get(
    "/mine",
    requireAuth,
    requireRole("Job Seeker"),
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT a.*, j.title
                 FROM applications a
                 JOIN jobs j ON j.id = a.job_id
                 WHERE a.applicant_id = ?
                 ORDER BY a.applied_at DESC`,
                [req.session.user.id]
            );

            res.json(rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not load applications"
            });
        }
    }
);

// Withdraw an application
router.patch(
    "/:id/withdraw",
    requireAuth,
    requireRole("Job Seeker"),
    async (req, res) => {
        try {
            const [result] = await pool.query(
                `UPDATE applications
                 SET status = 'Withdrawn'
                 WHERE id = ?
                 AND applicant_id = ?
                 AND status = 'Pending'`,
                [req.params.id, req.session.user.id]
            );

            if (!result.affectedRows) {
                return res.status(404).json({
                    message: "Pending application not found"
                });
            }

            res.json({
                message: "Application withdrawn"
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not withdraw application"
            });
        }
    }
);

// Recruiter: view applicants for their jobs
router.get(
    "/job/:jobId",
    requireAuth,
    requireRole("Recruiter"),
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT a.*, u.name, u.email
                 FROM applications a
                 JOIN users u ON u.id = a.applicant_id
                 JOIN jobs j ON j.id = a.job_id
                 WHERE a.job_id = ?
                 AND j.recruiter_id = ?
                 ORDER BY a.applied_at DESC`,
                [req.params.jobId, req.session.user.id]
            );

            res.json(rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not load applicants"
            });
        }
    }
);

// Recruiter: update an applicant's status
router.patch(
    "/:id/status",
    requireAuth,
    requireRole("Recruiter"),
    async (req, res) => {
        try {
            const allowedStatuses = [
                "Reviewed",
                "Shortlisted",
                "Rejected",
                "Accepted"
            ];

            const { status } = req.body;

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid application status"
                });
            }

            const [result] = await pool.query(
                `UPDATE applications a
                 JOIN jobs j ON j.id = a.job_id
                 SET a.status = ?
                 WHERE a.id = ?
                 AND j.recruiter_id = ?`,
                [status, req.params.id, req.session.user.id]
            );

            if (!result.affectedRows) {
                return res.status(404).json({
                    message: "Application not found"
                });
            }

            res.json({
                message: "Application status updated"
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not update application"
            });
        }
    }
);

module.exports = router;