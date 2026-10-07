import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [formPerformance, setFormPerformance] = useState([]);
  const [recentComments, setRecentComments] = useState([]);
  const [actionSummary, setActionSummary] = useState({
    open: 0,
    inProgress: 0,
    completed: 0,
  });

  const [organizations, setOrganizations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | FORMAT DATE
  |--------------------------------------------------------------------------
  */

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /*
  |--------------------------------------------------------------------------
  | FORMAT PERCENTAGE
  |--------------------------------------------------------------------------
  */

  const formatPercentage = (value) => {
    const number = Number(value);

    if (Number.isNaN(number)) {
      return "0%";
    }

    return `${number.toFixed(0)}%`;
  };

  /*
  |--------------------------------------------------------------------------
  | FETCH DASHBOARD DATA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        /*
        |--------------------------------------------------------------------------
        | SUPER ADMIN
        |--------------------------------------------------------------------------
        */

        if (user?.role === "SUPER_ADMIN") {
          const response = await api.get("/organizations");

          const organizationData =
            response.data?.organizations || [];

          const activeOrganizations =
            organizationData.filter(
              (organization) =>
                organization.status === "ACTIVE"
            );

          const inactiveOrganizations =
            organizationData.filter(
              (organization) =>
                organization.status === "INACTIVE"
            );

          const sortedOrganizations = [
            ...organizationData,
          ].sort((a, b) => {
            const dateA = new Date(
              a.createdAt || 0
            ).getTime();

            const dateB = new Date(
              b.createdAt || 0
            ).getTime();

            return dateB - dateA;
          });

          setOrganizations(
            sortedOrganizations.slice(0, 5)
          );

          setSummary({
            totalOrganizations:
              organizationData.length,

            activeOrganizations:
              activeOrganizations.length,

            inactiveOrganizations:
              inactiveOrganizations.length,
          });

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | ORGANIZATION ADMIN / MANAGER
        |--------------------------------------------------------------------------
        */

        if (
          user?.role === "ORG_ADMIN" ||
          user?.role === "MANAGER"
        ) {
          const response = await api.get(
            "/analytics/summary"
          );

          /*
          |--------------------------------------------------------------------------
          | IMPORTANT
          |--------------------------------------------------------------------------
          |
          | Backend returns:
          |
          | {
          |   summary: {...},
          |   formPerformance: [...],
          |   recentComments: [...],
          |   actionSummary: {...}
          | }
          |
          | So we must read response.data.summary.
          |
          */

          const dashboardData =
            response.data || {};

          setSummary(
            dashboardData.summary || {}
          );

          setFormPerformance(
            dashboardData.formPerformance || []
          );

          setRecentComments(
            dashboardData.recentComments || []
          );

          setActionSummary(
            dashboardData.actionSummary || {
              open: 0,
              inProgress: 0,
              completed: 0,
            }
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | UNKNOWN ROLE
        |--------------------------------------------------------------------------
        */

        setError(
          "Your account does not have dashboard access."
        );
      } catch (err) {
        console.error(
          "Dashboard error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    if (user?.role) {
      fetchDashboardData();
    }
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-state">
          Loading dashboard...
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="error-box">
          {error}
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SUPER ADMIN DASHBOARD
  |--------------------------------------------------------------------------
  */

  if (user?.role === "SUPER_ADMIN") {
    return (
      <div className="dashboard-page">

        <div className="page-header">
          <div>
            <h1>Dashboard</h1>

            <p>
              Overview of organizations managed by
              the system.
            </p>
          </div>
        </div>

        {/* ORGANIZATION METRICS */}

        <div className="dashboard-grid">

          <div className="stat-card">
            <span className="stat-label">
              Total Organizations
            </span>

            <strong className="stat-value">
              {summary?.totalOrganizations ?? 0}
            </strong>

            <span className="stat-description">
              Organizations in the system
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              Active Organizations
            </span>

            <strong className="stat-value">
              {summary?.activeOrganizations ?? 0}
            </strong>

            <span className="stat-description">
              Currently active
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              Inactive Organizations
            </span>

            <strong className="stat-value">
              {summary?.inactiveOrganizations ?? 0}
            </strong>

            <span className="stat-description">
              Currently inactive
            </span>
          </div>

        </div>

        {/* RECENT ORGANIZATIONS */}

        <div className="dashboard-section">

          <div className="section-header">
            <div>
              <h2>Recent Organizations</h2>

              <p>
                Recently created organizations.
              </p>
            </div>
          </div>

          {organizations.length === 0 ? (
            <div className="empty-state">
              <h3>No organizations yet</h3>

              <p>
                Create an organization to get started.
              </p>
            </div>
          ) : (
            <div className="table-container">

              <table className="data-table">

                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>

                  {organizations.map(
                    (organization) => (
                      <tr
                        key={organization._id}
                      >
                        <td>
                          <div className="table-primary">
                            {organization.name ||
                              "Unnamed Organization"}
                          </div>
                        </td>

                        <td>
                          <div className="table-secondary">
                            {organization.description ||
                              "—"}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${
                              organization.status ===
                              "ACTIVE"
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {organization.status ||
                              "UNKNOWN"}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            organization.createdAt
                          )}
                        </td>
                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ORGANIZATION ADMIN / MANAGER DASHBOARD
  |--------------------------------------------------------------------------
  */

  return (
    <div className="dashboard-page">

      {/* PAGE HEADER */}

      <div className="page-header">
        <div>
          <h1>Dashboard</h1>

          <p>
            Overview of your feedback management
            system.
          </p>
        </div>
      </div>

      {/* ================================================================
          MAIN METRICS
      ================================================================= */}

      <div className="dashboard-grid">

        {/* TOTAL FORMS */}

        <div className="stat-card">
          <span className="stat-label">
            Total Forms
          </span>

          <strong className="stat-value">
            {summary?.totalForms ?? 0}
          </strong>

          <span className="stat-description">
            Feedback forms
          </span>
        </div>

        {/* ACTIVE FORMS */}

        <div className="stat-card">
          <span className="stat-label">
            Active Forms
          </span>

          <strong className="stat-value">
            {summary?.activeForms ?? 0}
          </strong>

          <span className="stat-description">
            Currently active
          </span>
        </div>

        {/* TOTAL RESPONSES */}

        <div className="stat-card">
          <span className="stat-label">
            Total Responses
          </span>

          <strong className="stat-value">
            {summary?.totalResponses ?? 0}
          </strong>

          <span className="stat-description">
            Submitted responses
          </span>
        </div>

        {/* RESPONSE RATE */}

        <div className="stat-card">
          <span className="stat-label">
            Response Rate
          </span>

          <strong className="stat-value">
            {formatPercentage(
              summary?.participationRate
            )}
          </strong>

          <span className="stat-description">
            Overall participation
          </span>
        </div>

        {/* AVERAGE RATING */}

        <div className="stat-card">
          <span className="stat-label">
            Average Rating
          </span>

          <strong className="stat-value">
            {Number(
              summary?.averageRating || 0
            ).toFixed(2)}
          </strong>

          <span className="stat-description">
            Overall feedback rating
          </span>
        </div>

        {/* OPEN ACTIONS */}

        <div className="stat-card">
          <span className="stat-label">
            Open Actions
          </span>

          <strong className="stat-value">
            {actionSummary?.open ?? 0}
          </strong>

          <span className="stat-description">
            Improvement actions requiring attention
          </span>
        </div>

      </div>

      {/* ================================================================
          FORM PERFORMANCE
      ================================================================= */}

      <div className="dashboard-section">

        <div className="section-header">
          <div>
            <h2>Form Performance</h2>

            <p>
              Overview of response activity across
              feedback forms.
            </p>
          </div>
        </div>

        {formPerformance.length === 0 ? (
          <div className="empty-state">
            <h3>No form data available</h3>

            <p>
              Create and assign a feedback form to
              start collecting responses.
            </p>
          </div>
        ) : (
          <div className="table-container">

            <table className="data-table">

              <thead>
                <tr>
                  <th>Form</th>
                  <th>Status</th>
                  <th>Responses</th>
                  <th>Response Rate</th>
                </tr>
              </thead>

              <tbody>

                {formPerformance
                  .slice(0, 10)
                  .map((form) => (
                    <tr
                      key={form.formId}
                    >

                      <td>
                        <div className="table-primary">
                          {form.title ||
                            "Untitled Form"}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            form.status ===
                            "ACTIVE"
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          {form.status ||
                            "UNKNOWN"}
                        </span>
                      </td>

                      <td>
                        {form.responses ?? 0}
                      </td>

                      <td>
                        {formatPercentage(
                          form.responseRate
                        )}
                      </td>

                    </tr>
                  ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ================================================================
          ACTION SUMMARY
      ================================================================= */}

      <div className="dashboard-section">

        <div className="section-header">
          <div>
            <h2>Improvement Actions</h2>

            <p>
              Current status of actions created from
              feedback.
            </p>
          </div>
        </div>

        <div className="dashboard-grid">

          <div className="stat-card">
            <span className="stat-label">
              Open
            </span>

            <strong className="stat-value">
              {actionSummary?.open ?? 0}
            </strong>

            <span className="stat-description">
              Actions awaiting work
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              In Progress
            </span>

            <strong className="stat-value">
              {actionSummary?.inProgress ?? 0}
            </strong>

            <span className="stat-description">
              Actions currently being handled
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              Completed
            </span>

            <strong className="stat-value">
              {actionSummary?.completed ?? 0}
            </strong>

            <span className="stat-description">
              Completed improvement actions
            </span>
          </div>

        </div>

      </div>

      {/* ================================================================
          RECENT COMMENTS
      ================================================================= */}

      <div className="dashboard-section">

        <div className="section-header">
          <div>
            <h2>Recent Feedback</h2>

            <p>
              Recent comments submitted through
              feedback forms.
            </p>
          </div>
        </div>

        {recentComments.length === 0 ? (
          <div className="empty-state">
            <h3>No comments yet</h3>

            <p>
              Text feedback will appear here once
              participants submit responses.
            </p>
          </div>
        ) : (
          <div className="table-container">

            <table className="data-table">

              <thead>
                <tr>
                  <th>Question</th>
                  <th>Comment</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>

                {recentComments
                  .slice(0, 5)
                  .map((comment, index) => (
                    <tr
                      key={
                        comment._id ||
                        comment.questionId ||
                        index
                      }
                    >

                      <td>
                        <div className="table-primary">
                          {comment.questionText ||
                            "—"}
                        </div>
                      </td>

                      <td>
                        <div className="table-secondary">
                          {comment.comment ||
                            "—"}
                        </div>
                      </td>

                      <td>
                        {formatDate(
                          comment.createdAt
                        )}
                      </td>

                    </tr>
                  ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
};

export default Dashboard;