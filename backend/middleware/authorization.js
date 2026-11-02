function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            message: "Please log in first"
        });
    }

    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                message: "Please log in first"
            });
        }

        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({
                message: "You do not have permission"
            });
        }

        next();
    };
}

module.exports = { requireAuth, requireRole };