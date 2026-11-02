import { useEffect, useState } from "react";

const API_URL = "http://localhost:5001";

const emptyJob = {
  title: "",
  company: "",
  location: "",
  salary: "",
  job_type: "",
  description: "",
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

export default function RecruiterDashboard({ user }) {
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("jobs");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadJobs() {
    const data = await apiRequest("/jobs/mine");
    setJobs(Array.isArray(data) ? data : []);
  }

  async function loadNotifications() {
    const data = await apiRequest("/notifications/");
    setNotifications(Array.isArray(data) ? data : []);
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadJobs(), loadNotifications()]);
    } catch (err) {
      setError(err.message || "Could not load recruiter dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function handleJobChange(event) {
    const { name, value } = event.target;
    setJobForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function startEditing(job) {
    setEditingId(job.id);
    setJobForm({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      salary: job.salary || "",
      job_type: job.job_type || "",
      description: job.description || "",
    });
    setActiveTab("form");
    setError("");
    setMessage("");
  }

  function resetJobForm() {
    setEditingId(null);
    setJobForm(emptyJob);
  }

  async function saveJob(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await apiRequest(`/jobs/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(jobForm),
        });
        setMessage("Job updated successfully.");
      } else {
        await apiRequest("/jobs", {
          method: "POST",
          body: JSON.stringify(jobForm),
        });
        setMessage("Job posted successfully.");
      }

      resetJobForm();
      await loadJobs();
      setActiveTab("jobs");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob(jobId) {
    if (!window.confirm("Are you sure you want to delete this job?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/jobs/${jobId}`, {
        method: "DELETE",
      });

      setMessage("Job deleted successfully.");

      if (selectedJob === jobId) {
        setSelectedJob(null);
        setApplications([]);
      }

      await loadJobs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function viewApplicants(job) {
    setSelectedJob(job.id);
    setActiveTab("applicants");
    setError("");
    setMessage("");
    setApplications([]);

    try {
      const data = await apiRequest(`/applications/job/${job.id}`);
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load applicants.");
    }
  }

  async function updateApplicationStatus(applicationId, status) {
    setError("");
    setMessage("");

    try {
      await apiRequest(`/applications/${applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setMessage(`Application marked as ${status}.`);

      if (selectedJob) {
        const data = await apiRequest(
          `/applications/job/${selectedJob}`
        );
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function markNotificationRead(notificationId) {
    setError("");

    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAllRead() {
    setError("");

    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH",
      });
      setMessage("All notifications marked as read.");
      await loadNotifications();
    } catch (err) {
      setError(err.message);
    }
  }

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  if (loading) {
    return (
      <section className="recruiter-dashboard">
        <p>Loading recruiter dashboard...</p>
      </section>
    );
  }

  return (
    <section className="recruiter-dashboard">
      <div className="recruiter-heading">
        <div>
          <span className="eyebrow">RECRUITER WORKSPACE</span>
          <h2>Recruiter Dashboard</h2>
          <p>Welcome, {user?.name || "Recruiter"}.</p>
        </div>
        <span className="role-chip">Recruiter</span>
      </div>

      <div className="recruiter-stats">
        <article className="stat-card">
          <span className="stat-label">Your posted jobs</span>
          <strong>{jobs.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Notifications</span>
          <strong>{unreadCount}</strong>
        </article>
      </div>

      <nav className="recruiter-tabs">
        <button
          className={activeTab === "jobs" ? "active" : ""}
          onClick={() => {
            setActiveTab("jobs");
            setError("");
          }}
        >
          My Jobs
        </button>
        <button
          className={activeTab === "form" ? "active" : ""}
          onClick={() => {
            resetJobForm();
            setActiveTab("form");
            setError("");
          }}
        >
          Post a Job
        </button>
        <button
          className={activeTab === "notifications" ? "active" : ""}
          onClick={() => {
            setActiveTab("notifications");
            loadNotifications().catch((err) => setError(err.message));
          }}
        >
          Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
        </button>
      </nav>

      {error && <p className="feature-error">{error}</p>}
      {message && <p className="feature-success">{message}</p>}

      {activeTab === "jobs" && (
        <div className="recruiter-section">
          <div className="recruiter-section-heading">
            <h3>My Posted Jobs</h3>
            <button
              type="button"
              onClick={() => {
                resetJobForm();
                setActiveTab("form");
              }}
            >
              + Post New Job
            </button>
          </div>

          {jobs.length === 0 ? (
            <p>You have not posted any jobs yet.</p>
          ) : (
            <div className="feature-list">
              {jobs.map((job) => (
                <article className="feature-item" key={job.id}>
                  <h4>{job.title}</h4>
                  <p>{job.company} · {job.location}</p>
                  <p>{job.job_type || "Job type not specified"}</p>
                  <div className="recruiter-actions">
                    <button onClick={() => viewApplicants(job)}>
                      View Applicants
                    </button>
                    <button onClick={() => startEditing(job)}>
                      Edit
                    </button>
                    <button
                      className="feature-danger-button"
                      onClick={() => deleteJob(job.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "form" && (
        <div className="recruiter-section">
          <h3>{editingId ? "Edit Job" : "Post a New Job"}</h3>

          <form className="profile-form" onSubmit={saveJob}>
            <label>
              Job Title *
              <input
                name="title"
                value={jobForm.title}
                onChange={handleJobChange}
                required
              />
            </label>

            <label>
              Company *
              <input
                name="company"
                value={jobForm.company}
                onChange={handleJobChange}
                required
              />
            </label>

            <label>
              Location *
              <input
                name="location"
                value={jobForm.location}
                onChange={handleJobChange}
                required
              />
            </label>

            <label>
              Salary
              <input
                name="salary"
                value={jobForm.salary}
                onChange={handleJobChange}
                placeholder="e.g. ₹5-8 LPA"
              />
            </label>

            <label>
              Job Type
              <select
                name="job_type"
                value={jobForm.job_type}
                onChange={handleJobChange}
              >
                <option value="">Select job type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Internship">Internship</option>
                <option value="Remote">Remote</option>
                <option value="Contract">Contract</option>
              </select>
            </label>

            <label>
              Description
              <textarea
                name="description"
                value={jobForm.description}
                onChange={handleJobChange}
                rows={5}
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Job"
                  : "Publish Job"}
            </button>

            {editingId && (
              <button
                type="button"
                className="feature-danger-button"
                onClick={() => {
                  resetJobForm();
                  setActiveTab("jobs");
                }}
              >
                Cancel Editing
              </button>
            )}
          </form>
        </div>
      )}

      {activeTab === "applicants" && (
        <div className="recruiter-section">
          <h3>
            Applicants for{" "}
            {jobs.find((job) => job.id === selectedJob)?.title || "Selected Job"}
          </h3>

          {applications.length === 0 ? (
            <p>No applicants found for this job.</p>
          ) : (
            <div className="feature-list">
              {applications.map((application) => (
                <article className="feature-item" key={application.id}>
                  <h4>
                    {application.name ||
                      application.applicant_name ||
                      `Applicant #${application.applicant_id}`}
                  </h4>
                  <p>Email: {application.email || "Not provided"}</p>
                  <p>Status: {application.status || "Pending"}</p>
                  <p>Cover letter: {application.cover_letter || "Not provided"}</p>
                  {application.resume_url && (
                    <p>
                      <a href={application.resume_url} target="_blank" rel="noreferrer">
                        View Resume
                      </a>
                    </p>
                  )}

                  <label>
                    Update Status
                    <select
                      value={application.status || "Pending"}
                      onChange={(event) =>
                        updateApplicationStatus(
                          application.id,
                          event.target.value
                        )
                      }
                    >
                      <option value="Pending" disabled>Pending</option>
                      <option value="Reviewed">Reviewed</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Accepted">Accepted</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
          >
            Back to My Jobs
          </button>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="recruiter-section">
          <div className="recruiter-section-heading">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={markAllRead}>Mark All as Read</button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p>You have no notifications.</p>
          ) : (
            <div className="feature-list">
              {notifications.map((item) => (
                <article
                  className={
                    item.is_read ? "feature-item" : "feature-item unread"
                  }
                  key={item.id}
                >
                  <h4>{item.title || "Notification"}</h4>
                  <p>
                    {item.message || item.content || "You have a new update."}
                  </p>
                  <p>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : ""}
                  </p>
                  {!item.is_read && (
                    <button onClick={() => markNotificationRead(item.id)}>
                      Mark as Read
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}