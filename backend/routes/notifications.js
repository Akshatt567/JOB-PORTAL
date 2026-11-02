const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth } =
    require("../middleware/authorization");

router.get("/", requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.session.user.id]
        );

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not load notifications"
        });
    }
});

router.patch("/read-all", requireAuth, async (req, res) => {
    try {
        await pool.query(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = ?",
            [req.session.user.id]
        );

        res.json({
            message: "All notifications marked as read"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not update notifications"
        });
    }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
    try {
        const [result] = await pool.query(
            `UPDATE notifications SET is_read = TRUE
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.session.user.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.json({
            message: "Notification marked as read"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not update notification"
        });
    }
});

module.exports = router;