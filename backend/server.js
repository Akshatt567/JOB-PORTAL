const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const db = require("./db");
const jobsRouter = require("./routes/jobs");
const session = require("express-session");
const authRouter = require("./routes/auth");
const profileRoutes = require("./routes/profiles");
const applicationRoutes = require("./routes/applications");
const savedJobsRoutes = require("./routes/savedJobs");
const notificationRoutes = require("./routes/notifications");
const resumeAnalyzerRouter = require("./routes/resumeAnalyzer");

dotenv.config();

const app = express();
app.use(
  session({
    name: "jobportal.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(
  cors({
    origin:  "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/jobs", jobsRouter);
app.use("/auth", authRouter);
app.use("/profiles", profileRoutes);
app.use("/applications", applicationRoutes);
app.use("/saved-jobs", savedJobsRoutes);
app.use("/notifications", notificationRoutes);
app.use("/resume-analyzer", resumeAnalyzerRouter);
app.get("/", (req, res) => {
  res.json({ message: "Job Portal API Is Running!" });
});

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    const connection = await db.getConnection();

    console.log("Database connection established successfully.");
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();