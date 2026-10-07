import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Start LOGIN-based feedback
  |--------------------------------------------------------------------------
  */

  const startLoginFeedback = async (
    assignmentId
  ) => {
    const response = await api.post(
      "/participants/me/start-feedback",
      {
        assignmentId,
      }
    );

    sessionStorage.setItem(
      "feedbackAccess",
      JSON.stringify(response.data)
    );

    navigate("/take-feedback", {
      replace: true,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Decide participant destination
  |--------------------------------------------------------------------------
  */

  const handleParticipantLogin = async () => {
    /*
     * Get the feedback assignments that have
     * actually configured access credentials.
     *
     * IMPORTANT:
     * This endpoint no longer creates credentials.
     */
    const response = await api.get(
      "/participants/me/available-feedback"
    );

    const feedback =
      response.data?.feedback || [];

    /*
     * No configured feedback.
     */
    if (feedback.length === 0) {
      navigate("/participant-access", {
        replace: true,
      });

      return;
    }

    /*
     * Find forms explicitly configured
     * for LOGIN access.
     */
    const loginFeedback =
      feedback.filter((item) =>
        (
          item.accessMethods || []
        ).includes("LOGIN")
      );

    /*
     * ---------------------------------------------------------
     * CASE 1
     * Exactly one LOGIN feedback
     *
     * Participant has already logged in.
     * Open the feedback directly.
     * ---------------------------------------------------------
     */
    if (loginFeedback.length === 1) {
      await startLoginFeedback(
        loginFeedback[0].assignmentId
      );

      return;
    }

    /*
     * ---------------------------------------------------------
     * CASE 2
     * More than one LOGIN feedback
     *
     * We cannot randomly choose one.
     * Show the participant their configured
     * LOGIN feedback forms.
     * ---------------------------------------------------------
     */
    if (loginFeedback.length > 1) {
      navigate(
        "/participant-access?mode=login",
        {
          replace: true,
        }
      );

      return;
    }

    /*
     * ---------------------------------------------------------
     * CASE 3
     * No LOGIN access
     *
     * Therefore the participant must use the
     * configured public access method.
     *
     * Most commonly this will be ACCESS_CODE.
     * ---------------------------------------------------------
     */
    navigate(
      "/participant-access?mode=access",
      {
        replace: true,
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Login submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await login(
        email.trim(),
        password
      );

      /*
       * PARTICIPANT
       *
       * Determine destination based on
       * the Access Credential configuration.
       */
      if (
        data.user.role ===
        "PARTICIPANT"
      ) {
        try {
          await handleParticipantLogin();
        } catch (participantError) {
          console.error(
            "Participant access routing error:",
            participantError
          );

          setError(
            participantError.response?.data
              ?.message ||
              "Unable to determine your feedback access."
          );
        }

        return;
      }

      /*
       * ADMIN / MANAGER
       */
      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">
            F
          </div>

          <div>
            <h1>
              Feedback Management
            </h1>

            <span>
              System
            </span>
          </div>
        </div>

        <div className="login-heading">
          <h2>
            Welcome back
          </h2>

          <p>
            Sign in to continue to
            your account.
          </p>
        </div>

        {error && (
          <div
            className="login-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <span>
            Secure Feedback Management
            System
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;