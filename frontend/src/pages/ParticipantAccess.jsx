import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

import Button from "../components/ui/Button";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";

const ParticipantAccess = () => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const { user } = useAuth();

  const mode =
    searchParams.get("mode");

  const token =
    searchParams.get("token");

  const [accessCode, setAccessCode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    assignedFeedback,
    setAssignedFeedback,
  ] = useState([]);

  const [
    assignedLoading,
    setAssignedLoading,
  ] = useState(false);

  const [
    startingId,
    setStartingId,
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Validate public access
  |--------------------------------------------------------------------------
  */

  const validatePublicAccess =
    async (payload) => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.post(
            "/access-credentials/validate",
            payload
          );

        sessionStorage.setItem(
          "feedbackAccess",
          JSON.stringify(
            response.data
          )
        );

        navigate(
          "/take-feedback",
          {
            replace: true,
          }
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to validate access."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Load configured participant feedback
  |--------------------------------------------------------------------------
  */

  const loadAssignedFeedback =
    async () => {
      try {
        setAssignedLoading(true);
        setError("");

        const response =
          await api.get(
            "/participants/me/available-feedback"
          );

        setAssignedFeedback(
          response.data?.feedback || []
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to load assigned feedback."
        );
      } finally {
        setAssignedLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Initial loading
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    /*
     * UNIQUE LINK / QR
     *
     * Token is validated automatically.
     */
    if (token) {
      validatePublicAccess({
        uniqueToken: token,
      });

      return;
    }

    /*
     * Logged-in participant
     */
    if (
      user?.role ===
      "PARTICIPANT"
    ) {
      loadAssignedFeedback();
    }
  }, [
    user?.role,
    token,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Login assignments
  |--------------------------------------------------------------------------
  */

  const loginAssignments =
    useMemo(() => {
      return assignedFeedback.filter(
        (item) =>
          (
            item.accessMethods ||
            []
          ).includes("LOGIN")
      );
    }, [assignedFeedback]);

  /*
  |--------------------------------------------------------------------------
  | Access-code assignments
  |--------------------------------------------------------------------------
  */

  const accessCodeAssignments =
    useMemo(() => {
      return assignedFeedback.filter(
        (item) =>
          (
            item.accessMethods ||
            []
          ).includes(
            "ACCESS_CODE"
          )
      );
    }, [assignedFeedback]);

  /*
  |--------------------------------------------------------------------------
  | Start LOGIN feedback
  |--------------------------------------------------------------------------
  */

  const startLoginFeedback =
    async (assignmentId) => {
      try {
        setStartingId(
          assignmentId
        );

        setError("");

        const response =
          await api.post(
            "/participants/me/start-feedback",
            {
              assignmentId,
            }
          );

        sessionStorage.setItem(
          "feedbackAccess",
          JSON.stringify(
            response.data
          )
        );

        navigate(
          "/take-feedback",
          {
            replace: true,
          }
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to open feedback."
        );
      } finally {
        setStartingId(null);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Access Code
  |--------------------------------------------------------------------------
  */

  const handleAccessCode =
    async (event) => {
      event.preventDefault();

      const code =
        accessCode
          .trim()
          .toUpperCase();

      setError("");

      if (!code) {
        setError(
          "Please enter the access code."
        );

        return;
      }

      await validatePublicAccess({
        accessCode: code,
      });
    };

  /*
  |--------------------------------------------------------------------------
  | TOKEN SCREEN
  |--------------------------------------------------------------------------
  */

  if (token) {
    return (
      <div className="participant-access-page">
        <div className="participant-access-card">
          <div className="participant-access-brand">
            <div className="participant-access-brand-mark">
              F
            </div>

            <span>
              Feedback Management
            </span>
          </div>

          <div className="participant-access-header">
            <h1>
              Verifying Access
            </h1>

            <p>
              Please wait while we
              securely validate your
              access.
            </p>
          </div>

          {error && (
            <div
              className="participant-access-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {loading ? (
            <Loading />
          ) : (
            <Button
              onClick={() =>
                navigate(
                  "/participant-access",
                  {
                    replace: true,
                  }
                )
              }
            >
              Back to Access
            </Button>
          )}

          <div className="participant-access-security">
            Your access is securely
            validated before the feedback
            form opens.
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PUBLIC ACCESS CODE
  |--------------------------------------------------------------------------
  */

  if (
    !user ||
    user.role !==
      "PARTICIPANT"
  ) {
    return (
      <div className="participant-access-page">
        <div className="participant-access-card">
          <div className="participant-access-brand">
            <div className="participant-access-brand-mark">
              F
            </div>

            <span>
              Feedback Management
            </span>
          </div>

          <div className="participant-access-header">
            <h1>
              Give Your Feedback
            </h1>

            <p>
              Enter the access code
              provided to you.
            </p>
          </div>

          {error && (
            <div
              className="participant-access-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <form
            className="participant-access-form"
            onSubmit={
              handleAccessCode
            }
          >
            <div className="participant-access-field">
              <label htmlFor="accessCode">
                Access Code
              </label>

              <input
                id="accessCode"
                value={
                  accessCode
                }
                onChange={(event) =>
                  setAccessCode(
                    event.target.value
                  )
                }
                placeholder="Enter access code"
                autoComplete="off"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Verifying..."
                : "Continue"}
            </Button>
          </form>

          <div className="participant-access-security">
            The code is validated by the
            server before access is granted.
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | LOGGED-IN PARTICIPANT
  |--------------------------------------------------------------------------
  */

  return (
    <div className="participant-access-page">
      <div className="participant-access-card participant-assigned-card">
        <div className="participant-access-brand">
          <div className="participant-access-brand-mark">
            F
          </div>

          <span>
            Feedback Management
          </span>
        </div>

        <div className="participant-access-header">
          <h1>
            Feedback Access
          </h1>

          <p>
            Access your assigned feedback
            using the method configured for
            you.
          </p>
        </div>

        {error && (
          <div
            className="participant-access-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {assignedLoading ? (
          <Loading />
        ) : (
          <>
            {/* -------------------------------------------------------
                LOGIN FEEDBACK
            -------------------------------------------------------- */}

            {loginAssignments.length >
              0 && (
              <div className="participant-access-method-card">
                <div>
                  <span className="participant-access-method-label">
                    LOGIN ACCESS
                  </span>

                  <h2>
                    Your Assigned Feedback
                  </h2>

                  <p>
                    You are already authenticated.
                    Select the feedback form you
                    want to complete.
                  </p>
                </div>

                <div className="participant-assigned-list">
                  {loginAssignments.map(
                    (item) => (
                      <div
                        className="participant-assigned-item"
                        key={
                          item.assignmentId
                        }
                      >
                        <div>
                          <h3>
                            {item.title}
                          </h3>

                          {item.description && (
                            <p>
                              {
                                item.description
                              }
                            </p>
                          )}

                          <small>
                            {item.responseMode ===
                            "ANONYMOUS"
                              ? "Anonymous"
                              : "Identified"}

                            {item.endDate
                              ? ` · Due ${new Date(
                                  item.endDate
                                ).toLocaleDateString(
                                  "en-IN"
                                )}`
                              : ""}
                          </small>
                        </div>

                        <Button
                          onClick={() =>
                            startLoginFeedback(
                              item.assignmentId
                            )
                          }
                          disabled={
                            startingId ===
                            item.assignmentId
                          }
                        >
                          {startingId ===
                          item.assignmentId
                            ? "Opening..."
                            : "Open Feedback"}
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------
                ACCESS CODE
            -------------------------------------------------------- */}

            {accessCodeAssignments.length >
              0 && (
              <div className="participant-access-method-card">
                <div>
                  <span className="participant-access-method-label">
                    ACCESS CODE
                  </span>

                  <h2>
                    Enter Access Code
                  </h2>

                  <p>
                    Enter the code provided by
                    your administrator.
                  </p>
                </div>

                <form
                  className="participant-access-form"
                  onSubmit={
                    handleAccessCode
                  }
                >
                  <div className="participant-access-field">
                    <label htmlFor="accessCode">
                      Access Code
                    </label>

                    <input
                      id="accessCode"
                      value={
                        accessCode
                      }
                      onChange={(event) =>
                        setAccessCode(
                          event.target
                            .value
                        )
                      }
                      placeholder="Enter access code"
                      autoComplete="off"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Verifying..."
                      : "Access Feedback"}
                  </Button>
                </form>

                <div className="participant-access-security">
                  The access code is validated
                  securely by the server.
                </div>
              </div>
            )}

            {/* -------------------------------------------------------
                NOTHING AVAILABLE
            -------------------------------------------------------- */}

            {loginAssignments.length ===
              0 &&
              accessCodeAssignments.length ===
                0 && (
                <EmptyState
                  title="No feedback available"
                  description="You currently do not have a feedback form configured for login or access-code entry. If you were given a unique link or QR code, use that instead."
                />
              )}
          </>
        )}

        <button
          type="button"
          className="participant-access-secondary-button"
          onClick={
            loadAssignedFeedback
          }
          disabled={
            assignedLoading
          }
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default ParticipantAccess;