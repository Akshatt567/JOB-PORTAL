import { useEffect, useState } from "react";

const API_URL = "http://localhost:5001";

const emptyProfile = {
  phone: "",
  location: "",
  skills: "",
  education: "",
  experience: "",
  resume_url: "",
};

const features = [
  {
    id: "profile",
    number: "01",
    title: "Candidate Profile",
    description: "Manage your professional information.",
  },
  {
    id: "applications",
    number: "02",
    title: "My Applications",
    description: "Track and manage submitted applications.",
  },
  {
    id: "saved",
    number: "03",
    title: "Saved Jobs",
    description: "Revisit jobs you have saved.",
  },
  {
    id: "notifications",
    number: "04",
    title: "Notifications",
    description: "View important account updates.",
  },
  {
    id: "resume",
    number: "05",
    title: "AI Resume Analyzer",
    description: "Get AI-powered feedback on your resume.",
  },
];

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

export default function FeaturePanel({ user, jobs = [] }) {
  const [activeFeature, setActiveFeature] = useState("profile");
  const [profile, setProfile] = useState(emptyProfile);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [selectedJob, setSelectedJob] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [analyzingResume, setAnalyzingResume] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadFeature(feature) {
    setActiveFeature(feature);
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (feature === "profile") {
        const data = await apiRequest("/profiles/me");
        setProfile({ ...emptyProfile, ...data });
        setResumeUrl(data.resume_url || "");
      }

      if (feature === "applications") {
        const data = await apiRequest("/applications/mine");
        setApplications(Array.isArray(data) ? data : []);
      }

      if (feature === "saved") {
        const data = await apiRequest("/saved-jobs/");
        setSavedJobs(Array.isArray(data) ? data : []);
      }

      if (feature === "notifications") {
        const data = await apiRequest("/notifications/");
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err.message || "Could not load this feature.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeature("profile");
  }, []);

  function updateProfileField(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiRequest("/profiles/me", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      setMessage("Profile saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function applyForJob(event) {
    event.preventDefault();

    if (!selectedJob) {
      setError("Select a job before submitting your application.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiRequest("/applications/", {
        method: "POST",
        body: JSON.stringify({
          job_id: selectedJob,
          cover_letter: coverLetter,
          resume_url: resumeUrl || profile.resume_url,
        }),
      });

      setMessage("Application submitted successfully.");
      setSelectedJob("");
      setCoverLetter("");
      await loadFeature("applications");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function withdrawApplication(applicationId) {
    if (!window.confirm("Are you sure you want to withdraw this application?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`/applications/${applicationId}/withdraw`, {
        method: "PATCH",
      });
      setMessage("Application withdrawn.");
      await loadFeature("applications");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveJob(jobId) {
    setError("");
    setMessage("");

    try {
      await apiRequest(`/saved-jobs/${jobId}`, { method: "POST" });
      setMessage("Job saved successfully.");
      await loadFeature("saved");
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeSavedJob(jobId) {
    setError("");
    setMessage("");

    try {
      await apiRequest(`/saved-jobs/${jobId}`, { method: "DELETE" });
      setMessage("Saved job removed.");
      await loadFeature("saved");
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
      await loadFeature("notifications");
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAllNotificationsRead() {
    setError("");

    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH",
      });
      setMessage("All notifications marked as read.");
      await loadFeature("notifications");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleResumeSelection(event) {
    const file = event.target.files?.[0];

    setResumeFile(null);
    setResumeAnalysis(null);
    setError("");
    setMessage("");

    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file only.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("PDF size must be 5 MB or less.");
      event.target.value = "";
      return;
    }

    setResumeFile(file);
  }

  async function analyzeResume() {
    if (!resumeFile) {
      setError("Please select a PDF resume first.");
      return;
    }

    setAnalyzingResume(true);
    setError("");
    setMessage("");
    setResumeAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);

      const response = await fetch(`${API_URL}/resume-analyzer`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Resume analysis failed.");
      }

      setResumeAnalysis(data.analysis);
      setMessage("Resume analyzed successfully.");
    } catch (err) {
      setError(err.message || "Could not analyze your resume.");
    } finally {
      setAnalyzingResume(false);
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  function getJobId(job) {
    return job.job_id ?? job.id;
  }

  return (
    <section className="feature-panel">
      <div className="feature-header">
        <div>
          <span className="feature-eyebrow">JOB PORTAL SERVICES</span>
          <h2>Explore Your Features</h2>
          <p>
            Welcome {user?.name || "User"}. Manage your career from one place.
          </p>
        </div>
      </div>

      <div className="feature-grid">
        {features.map((feature) => (
          <button
            type="button"
            key={feature.id}
            className={
              activeFeature === feature.id
                ? "feature-card active"
                : "feature-card"
            }
            onClick={() => loadFeature(feature.id)}
          >
            <span className="feature-number">{feature.number}</span>
            <span className="feature-card-title">{feature.title}</span>
            <span className="feature-card-description">
              {feature.description}
            </span>
            {feature.id === "notifications" && unreadCount > 0 && (
              <span className="feature-count">{unreadCount} unread</span>
            )}
            <span className="feature-card-action">Open feature →</span>
          </button>
        ))}
      </div>

      <div className="feature-content">
        {error && <p className="feature-error">{error}</p>}
        {message && <p className="feature-success">{message}</p>}

        {loading ? (
          <p className="feature-loading">Loading...</p>
        ) : (
          <>
            {activeFeature === "profile" && (
              <div>
                <h3>Candidate Profile</h3>
                <form className="profile-form" onSubmit={saveProfile}>
                  <label>
                    Phone
                    <input name="phone" value={profile.phone || ""} onChange={updateProfileField} />
                  </label>

                  <label>
                    Location
                    <input name="location" value={profile.location || ""} onChange={updateProfileField} />
                  </label>

                  <label>
                    Skills
                    <textarea name="skills" value={profile.skills || ""} onChange={updateProfileField} />
                  </label>

                  <label>
                    Education
                    <textarea name="education" value={profile.education || ""} onChange={updateProfileField} />
                  </label>

                  <label>
                    Experience
                    <textarea name="experience" value={profile.experience || ""} onChange={updateProfileField} />
                  </label>

                  <label>
                    Resume URL
                    <input
                      name="resume_url"
                      type="url"
                      value={profile.resume_url || ""}
                      onChange={updateProfileField}
                      placeholder="https://..."
                    />
                  </label>

                  <button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </form>
              </div>
            )}

            {activeFeature === "applications" && (
              <div>
                <h3>Apply for a Job</h3>

                <form className="profile-form" onSubmit={applyForJob}>
                  <label>
                    Select Job
                    <select value={selectedJob} onChange={(event) => setSelectedJob(event.target.value)}>
                      <option value="">Choose a job</option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title || `Job #${job.id}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Cover Letter
                    <textarea
                      value={coverLetter}
                      onChange={(event) => setCoverLetter(event.target.value)}
                      placeholder="Write a short cover letter..."
                    />
                  </label>

                  <label>
                    Resume URL
                    <input
                      type="url"
                      value={resumeUrl}
                      onChange={(event) => setResumeUrl(event.target.value)}
                      placeholder="https://..."
                    />
                  </label>

                  <button type="submit" disabled={saving || jobs.length === 0}>
                    {saving ? "Submitting..." : "Submit Application"}
                  </button>
                </form>

                <h3 className="feature-subheading">My Applications</h3>
                {applications.length === 0 ? (
                  <p>No applications submitted yet.</p>
                ) : (
                  <div className="feature-list">
                    {applications.map((application) => (
                      <article className="feature-item" key={application.id}>
                        <h4>{application.title || `Job #${application.job_id}`}</h4>
                        <p>Status: {application.status || "Pending"}</p>
                        <p>
                          Applied:{" "}
                          {application.applied_at
                            ? new Date(application.applied_at).toLocaleDateString()
                            : "Date unavailable"}
                        </p>
                        {application.status === "Pending" && (
                          <button
                            type="button"
                            className="feature-danger-button"
                            onClick={() => withdrawApplication(application.id)}
                          >
                            Withdraw
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeFeature === "saved" && (
              <div>
                <h3>Saved Jobs</h3>

                <h4>Available Jobs</h4>
                {jobs.length === 0 ? (
                  <p>No jobs are currently available.</p>
                ) : (
                  <div className="feature-list">
                    {jobs.map((job) => (
                      <article className="feature-item" key={job.id}>
                        <h4>{job.title || "Untitled job"}</h4>
                        <p>{job.location || "Location not specified"}</p>
                        <button type="button" onClick={() => saveJob(job.id)}>
                          Save Job
                        </button>
                      </article>
                    ))}
                  </div>
                )}

                <h4 className="feature-subheading">Your Saved Jobs</h4>
                {savedJobs.length === 0 ? (
                  <p>You have not saved any jobs yet.</p>
                ) : (
                  <div className="feature-list">
                    {savedJobs.map((job) => (
                      <article className="feature-item" key={getJobId(job)}>
                        <h4>{job.title || "Untitled job"}</h4>
                        <p>{job.location || "Location not specified"}</p>
                        <button
                          type="button"
                          className="feature-danger-button"
                          onClick={() => removeSavedJob(getJobId(job))}
                        >
                          Remove Saved Job
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeFeature === "notifications" && (
              <div>
                <div className="feature-section-heading">
                  <h3>Notifications</h3>
                  {notifications.length > 0 && (
                    <button type="button" onClick={markAllNotificationsRead}>
                      Mark All as Read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p>You have no notifications.</p>
                ) : (
                  <div className="feature-list">
                    {notifications.map((notification) => (
                      <article
                        className={
                          notification.is_read
                            ? "feature-item"
                            : "feature-item unread"
                        }
                        key={notification.id}
                      >
                        <h4>{notification.title || "Notification"}</h4>
                        <p>
                          {notification.message ||
                            notification.content ||
                            "You have a new update."}
                        </p>
                        <p>
                          {notification.created_at
                            ? new Date(notification.created_at).toLocaleString()
                            : ""}
                        </p>
                        {!notification.is_read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(notification.id)}
                          >
                            Mark as Read
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeFeature === "resume" && (
              <div className="resume-analyzer">
                <h3>AI Resume Analyzer</h3>
                <p>
                  Upload your PDF resume and let Gemini AI evaluate its
                  content and suggest improvements.
                </p>

                <div className="resume-upload-box">
                  <label htmlFor="resume-pdf-upload">
                    <strong>Upload your resume (PDF)</strong>
                    <span>Select a PDF file from your device.</span>
                  </label>

                  <input
                    id="resume-pdf-upload"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleResumeSelection}
                    disabled={analyzingResume}
                  />

                  {resumeFile && (
                    <p className="resume-selected-file">
                      Selected: {resumeFile.name} (
                      {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={analyzeResume}
                    disabled={!resumeFile || analyzingResume}
                  >
                    {analyzingResume
                      ? "Analyzing Resume..."
                      : "Analyze Resume with AI"}
                  </button>

                  {analyzingResume && (
                    <p className="feature-loading">
                      Gemini AI is reviewing your resume. Please wait.
                    </p>
                  )}
                </div>

                {resumeAnalysis && (
                  <div className="resume-analysis-results">
                    <h3>Resume Analysis Results</h3>

                    <div className="resume-score">
                      <span>Overall Resume Score</span>
                      <strong>{resumeAnalysis.score}/100</strong>
                    </div>

                    <div className="resume-result-section">
                      <h4>Overall Assessment</h4>
                      <p>{resumeAnalysis.summary}</p>
                    </div>

                    <div className="resume-result-section">
                      <h4>Strengths</h4>
                      <ul>
                        {(resumeAnalysis.strengths || []).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="resume-result-section">
                      <h4>Weaknesses</h4>
                      <ul>
                        {(resumeAnalysis.weaknesses || []).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="resume-result-section">
                      <h4>Identified Skills</h4>
                      <ul>
                        {(resumeAnalysis.skills || []).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="resume-result-section">
                      <h4>Missing Information</h4>
                      <ul>
                        {(resumeAnalysis.missingInformation || []).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="resume-result-section">
                      <h4>Improvement Suggestions</h4>
                      <ul>
                        {(resumeAnalysis.suggestions || []).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="resume-result-section">
                      <h4>Recommended Job Roles</h4>
                      <ul>
                        {(resumeAnalysis.recommendedRoles || []).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}