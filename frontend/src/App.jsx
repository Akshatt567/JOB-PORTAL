import { useEffect, useState } from "react";
import "./App.css";
import FeaturePanel from "./featurePanel.jsx";
import RecruiterDashboard from "./RecruiterDashboard.jsx";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export default function App() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Job Seeker",
  });

  // Check whether a session already exists.
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });

        const data = await response.json();

        if (active && response.ok && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        if (active) {
          setError("Cannot connect to the server. Check that your backend is running.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  // Load jobs after login.
  useEffect(() => {
    if (!user) return;

    let active = true;

    async function loadJobs() {
      try {
        const response = await fetch(`${API_URL}/jobs`, {
          credentials: "include",
        });

        if (!response.ok) return;

        const data = await response.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.jobs)
            ? data.jobs
            : [];

        if (active) setJobs(list);
      } catch {
        // The dashboard remains usable if jobs cannot be loaded.
      }
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, [user]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleAuth(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setAuthLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";

      const payload = isRegister
        ? form
        : {
            email: form.email,
            password: form.password,
          };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      if (isRegister) {
        setIsRegister(false);
        setForm((previous) => ({
          ...previous,
          password: "",
        }));
        setNotice("Account created. Sign in with your email and password.");
      } else if (data.user) {
        setUser(data.user);
        setNotice("");
      } else {
        // Recover the session if the login response did not include a user.
        const sessionResponse = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });
        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok || !sessionData.user) {
          throw new Error("Login succeeded, but the session could not be loaded.");
        }

        setUser(sessionData.user);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed. Please try again.");
      }

      setUser(null);
      setJobs([]);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "Job Seeker",
      });
    } catch (err) {
      setError(err.message || "Could not log out.");
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const text = [
      job.title,
      job.company,
      job.location,
      job.description,
      job.job_type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <main className="app-shell">
        <div className="loading-card">
          <div className="loader" />
          <p>Loading Job Portal...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Job Portal home">
          <span className="brand-mark">J</span>
          <span>Job<span className="accent">Portal</span></span>
        </a>

        {user && (
          <div className="topbar-user">
            <span className="user-name">{user.name || user.email}</span>
            <button className="button button-outline button-small" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </header>

      {!user ? (
        <section className="auth-layout" id="home">
          <div className="hero-copy">
            <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
            <h1>
              Find work that
              <br />
              <span className="accent">moves you forward.</span>
            </h1>
            <p className="hero-description">
              Discover opportunities, connect with employers, and take the next
              step in your career.
            </p>

            <div className="hero-points">
              <div><span className="point-icon">✓</span> Explore job opportunities</div>
              <div><span className="point-icon">✓</span> Manage your career in one place</div>
              <div><span className="point-icon">✓</span> Connect with the right teams</div>
            </div>
          </div>

          <section className="auth-card">
            <div className="card-heading">
              <span className="eyebrow">{isRegister ? "GET STARTED" : "WELCOME BACK"}</span>
              <h2>{isRegister ? "Create your account" : "Sign in to Job Portal"}</h2>
              <p>
                {isRegister
                  ? "Enter your details to get started."
                  : "Enter your details to continue."}
              </p>
            </div>

            {error && <div className="alert alert-error" role="alert">{error}</div>}
            {notice && <div className="alert alert-success" role="status">{notice}</div>}

            <form onSubmit={handleAuth} className="auth-form">
              {isRegister && (
                <label>
                  Full name
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />
                </label>
              )}

              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                />
              </label>

              {isRegister && (
                <label>
                  Account type
                  <select name="role" value={form.role} onChange={handleChange}>
                    <option value="Job Seeker">Job Seeker</option>
                    <option value="Recruiter">Recruiter</option>
                  </select>
                </label>
              )}

              <button className="button button-primary button-full" type="submit" disabled={authLoading}>
                {authLoading
                  ? "Please wait..."
                  : isRegister
                    ? "Create account"
                    : "Sign in"}
                {!authLoading && <span aria-hidden="true"> →</span>}
              </button>
            </form>

            <div className="auth-switch">
              {isRegister ? "Already have an account?" : "New to Job Portal?"}
              <button
                type="button"
                onClick={() => {
                  setIsRegister((previous) => !previous);
                  setError("");
                  setNotice("");
                }}
              >
                {isRegister ? "Sign in" : "Create account"}
              </button>
            </div>
          </section>
        </section>
      ) : (
        <section className="dashboard" id="home">
          <div className="welcome-panel">
            <div>
              <span className="eyebrow">YOUR WORKSPACE</span>
              <h1>Welcome, {user.name || "there"}.</h1>
              <p>Your Job Portal dashboard is ready.</p>
            </div>
            <div className="role-chip">{user.role || "Member"}</div>
          </div>

          {user.role === "Recruiter" ? (
  <RecruiterDashboard user={user} />
) : user.role === "Job Seeker" ? (
  <FeaturePanel user={user} jobs={jobs} />
) : (
  <div className="empty-state">
    <h3>Unknown account role</h3>
    <p>Please check your account role in the database.</p>
  </div>
)}


          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <div className="stats-grid">
            <article className="stat-card">
              <span className="stat-label">Available jobs loaded</span>
              <strong>{jobs.length}</strong>
              <span className="stat-foot">From your job listings</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">Account</span>
              <strong className="stat-account">Active session</strong>
              <span className="stat-foot">{user.email}</span>
            </article>
          </div>

          <section className="jobs-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">EXPLORE OPPORTUNITIES</span>
                <h2>Latest jobs</h2>
              </div>
              <span className="jobs-count">{filteredJobs.length} shown</span>
            </div>

            <input
              className="job-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by job title, company, or location..."
              aria-label="Search jobs"
            />

            {filteredJobs.length > 0 ? (
              <div className="jobs-grid">
                {filteredJobs.map((job, index) => (
                  <article className="job-card" key={job.id ?? index}>
                    <div className="job-card-top">
                      <div className="company-avatar">
                        {(job.company || job.title || "J").charAt(0).toUpperCase()}
                      </div>
                      <span className="job-tag">{job.job_type || "Opportunity"}</span>
                    </div>
                    <h3>{job.title || "Untitled position"}</h3>
                    <p className="job-company">{job.company || "Company not specified"}</p>
                    {job.location && <p className="job-location">⌖ {job.location}</p>}
                    {job.description && <p className="job-description">{job.description}</p>}
                    {job.salary && <p className="job-salary">{job.salary}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">⌕</div>
                <h3>{jobs.length ? "No matching jobs" : "No job listings to show yet"}</h3>
                <p>
                  {jobs.length
                    ? "Try a different search term."
                    : "When job listings are available from your backend, they will appear here."}
                </p>
              </div>
            )}
          </section>

          <footer className="dashboard-footer">
            Signed in as {user.email}
          </footer>

        </section>
      )}
    </main>
  );
}