const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth, requireRole } =
    require("../middleware/authorization");

router.get(
    "/me",
    requireAuth,
    requireRole("Job Seeker"),
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                "SELECT * FROM candidate_profiles WHERE user_id = ?",
                [req.session.user.id]
            );

            res.json(rows[0] || {});
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not load profile"
            });
        }
    }
);

router.put(
    "/me",
    requireAuth,
    requireRole("Job Seeker"),
    async (req, res) => {
        try {
            const {
                phone,
                location,
                skills,
                education,
                experience,
                resume_url
            } = req.body;

            await pool.query(
                `INSERT INTO candidate_profiles
                (user_id, phone, location, skills, education,
                 experience, resume_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                phone = VALUES(phone),
                location = VALUES(location),
                skills = VALUES(skills),
                education = VALUES(education),
                experience = VALUES(experience),
                resume_url = VALUES(resume_url)`,
                [
                    req.session.user.id,
                    phone || null,
                    location || null,
                    skills || null,
                    education || null,
                    experience || null,
                    resume_url || null
                ]
            );

            res.json({
                message: "Profile saved successfully"
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not save profile"
            });
        }
    }
);

module.exports = router;