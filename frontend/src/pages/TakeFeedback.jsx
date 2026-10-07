import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../services/api";

const TakeFeedback = () => {
  const navigate = useNavigate();

  const [access, setAccess] = useState(null);
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  /*
   * ------------------------------------------------
   * LOAD
   * ------------------------------------------------
   */

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = () => {
    try {
      setLoading(true);
      setError("");

      const storedAccess =
        sessionStorage.getItem(
          "feedbackAccess"
        );

      if (!storedAccess) {
        navigate(
          "/participant-access",
          {
            replace: true,
          }
        );

        return;
      }

      const parsedAccess =
        JSON.parse(storedAccess);

      if (
        !parsedAccess.access ||
        !parsedAccess.form ||
        !parsedAccess.access.sessionToken
      ) {
        throw new Error(
          "Feedback access information is incomplete."
        );
      }

      setAccess(parsedAccess.access);
      setForm(parsedAccess.form);

      const activeQuestions = [
        ...(parsedAccess.questions || []),
      ]
        .filter(
          (question) =>
            question.status !== "INACTIVE"
        )
        .sort(
          (a, b) =>
            (a.order || 0) -
            (b.order || 0)
        );

      setQuestions(activeQuestions);
    } catch (err) {
      setError(
        err.message ||
          "Failed to load feedback form."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------
   * ANSWER HELPERS
   * ------------------------------------------------
   */

  const updateAnswer = (
    questionId,
    value
  ) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  };

  const updateCheckboxAnswer = (
    questionId,
    option,
    checked
  ) => {
    setAnswers((previous) => {
      const currentValues =
        Array.isArray(
          previous[questionId]
        )
          ? previous[questionId]
          : [];

      if (checked) {
        if (
          currentValues.includes(option)
        ) {
          return previous;
        }

        return {
          ...previous,
          [questionId]: [
            ...currentValues,
            option,
          ],
        };
      }

      return {
        ...previous,
        [questionId]:
          currentValues.filter(
            (value) =>
              value !== option
          ),
      };
    });
  };

  /*
   * ------------------------------------------------
   * PROGRESS
   * ------------------------------------------------
   */

  const answeredCount = useMemo(() => {
    return questions.filter((question) => {
      const answer =
        answers[question._id];

      if (
        answer === undefined ||
        answer === null ||
        answer === ""
      ) {
        return false;
      }

      if (
        Array.isArray(answer) &&
        answer.length === 0
      ) {
        return false;
      }

      return true;
    }).length;
  }, [answers, questions]);

  const progress =
    questions.length > 0
      ? Math.round(
          (answeredCount /
            questions.length) *
            100
        )
      : 0;

  /*
   * ------------------------------------------------
   * REQUIRED VALIDATION
   * ------------------------------------------------
   */

  const validateAnswers = () => {
    for (const question of questions) {
      if (!question.required) {
        continue;
      }

      const answer =
        answers[question._id];

      if (
        answer === undefined ||
        answer === null ||
        answer === "" ||
        (Array.isArray(answer) &&
          answer.length === 0)
      ) {
        setError(
          `Please answer: ${question.questionText}`
        );

        return false;
      }
    }

    return true;
  };

  /*
   * ------------------------------------------------
   * SUBMIT
   * ------------------------------------------------
   */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!validateAnswers()) {
      return;
    }

    if (!access?.sessionToken) {
      setError(
        "Your access session is missing. Please access the form again."
      );

      return;
    }

    try {
      setSubmitting(true);

      const responseAnswers =
        questions.map((question) => {
          const answer =
            answers[question._id];

          if (Array.isArray(answer)) {
            return {
              questionId: question._id,
              values: answer,
              value: answer.join(", "),
            };
          }

          return {
            questionId: question._id,
            value: answer,
          };
        });

      const payload = {
        assignmentId:
          access.assignmentId,

        formId:
          access.formId,

        sessionToken:
          access.sessionToken,

        answers:
          responseAnswers,
      };

      const response = await api.post(
        "/responses",
        payload
      );

      setSuccess(true);

      sessionStorage.removeItem(
        "feedbackAccess"
      );

      window.setTimeout(() => {
        navigate("/participant-access?mode=assigned", { replace: true });
      }, 1200);

      if (
        response.data?.confirmationMessage
      ) {
        setForm((previous) => ({
          ...previous,
          confirmationMessage:
            response.data
              .confirmationMessage,
        }));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit feedback."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ------------------------------------------------
   * QUESTION RENDERER
   * ------------------------------------------------
   */

  const renderQuestion = (question) => {
    const value =
      answers[question._id];

    switch (question.type) {
      case "STAR_RATING":
        return (
          <div className="feedback-rating">
            <div className="feedback-stars">
              {[1, 2, 3, 4, 5].map(
                (star) => (
                  <button
                    key={star}
                    type="button"
                    className={`feedback-star ${
                      Number(value) === star
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      updateAnswer(
                        question._id,
                        star
                      )
                    }
                    aria-label={`${star} star${
                      star > 1
                        ? "s"
                        : ""
                    }`}
                  >
                    ★
                  </button>
                )
              )}
            </div>

            <div className="rating-scale-labels">
              <span>Not satisfied</span>
              <span>Excellent</span>
            </div>
          </div>
        );

      case "NUMERIC_RATING": {
        const min = Number(
          question.minValue ?? 1
        );

        const max = Number(
          question.maxValue ?? 5
        );

        const numbers = [];

        for (
          let number = min;
          number <= max;
          number++
        ) {
          numbers.push(number);
        }

        return (
          <div className="numeric-rating">
            {numbers.map((number) => (
              <button
                key={number}
                type="button"
                className={`numeric-rating-button ${
                  Number(value) === number
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  updateAnswer(
                    question._id,
                    number
                  )
                }
              >
                {number}
              </button>
            ))}
          </div>
        );
      }

      case "MULTIPLE_CHOICE":
        return (
          <div className="feedback-choice-list">
            {(question.options || []).map(
              (option, index) => (
                <label
                  className={`feedback-choice ${
                    value === option
                      ? "selected"
                      : ""
                  }`}
                  key={index}
                >
                  <input
                    type="radio"
                    name={`question-${question._id}`}
                    checked={
                      value === option
                    }
                    onChange={() =>
                      updateAnswer(
                        question._id,
                        option
                      )
                    }
                  />

                  <span className="choice-radio">
                    <span></span>
                  </span>

                  <span className="choice-text">
                    {option}
                  </span>
                </label>
              )
            )}
          </div>
        );

      case "CHECKBOX":
        return (
          <div className="feedback-choice-list">
            {(question.options || []).map(
              (option, index) => {
                const selectedValues =
                  Array.isArray(value)
                    ? value
                    : [];

                const selected =
                  selectedValues.includes(
                    option
                  );

                return (
                  <label
                    className={`feedback-choice ${
                      selected
                        ? "selected"
                        : ""
                    }`}
                    key={index}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) =>
                        updateCheckboxAnswer(
                          question._id,
                          option,
                          event.target
                            .checked
                        )
                      }
                    />

                    <span className="choice-checkbox">
                      {selected && "✓"}
                    </span>

                    <span className="choice-text">
                      {option}
                    </span>
                  </label>
                );
              }
            )}
          </div>
        );

      case "DROPDOWN":
        return (
          <div className="feedback-select-wrapper">
            <select
              className="feedback-select"
              value={value || ""}
              onChange={(e) =>
                updateAnswer(
                  question._id,
                  e.target.value
                )
              }
            >
              <option value="">
                Select an option
              </option>

              {(question.options || []).map(
                (option, index) => (
                  <option
                    key={index}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>
          </div>
        );

      case "YES_NO":
        return (
          <div className="feedback-choice-list feedback-choice-list-small">
            <label
              className={`feedback-choice ${
                value === "YES"
                  ? "selected"
                  : ""
              }`}
            >
              <input
                type="radio"
                name={`question-${question._id}`}
                checked={
                  value === "YES"
                }
                onChange={() =>
                  updateAnswer(
                    question._id,
                    "YES"
                  )
                }
              />

              <span className="choice-radio">
                <span></span>
              </span>

              <span className="choice-text">
                Yes
              </span>
            </label>

            <label
              className={`feedback-choice ${
                value === "NO"
                  ? "selected"
                  : ""
              }`}
            >
              <input
                type="radio"
                name={`question-${question._id}`}
                checked={
                  value === "NO"
                }
                onChange={() =>
                  updateAnswer(
                    question._id,
                    "NO"
                  )
                }
              />

              <span className="choice-radio">
                <span></span>
              </span>

              <span className="choice-text">
                No
              </span>
            </label>
          </div>
        );

      case "SHORT_TEXT":
        return (
          <input
            type="text"
            className="feedback-text-input"
            value={value || ""}
            maxLength={500}
            onChange={(e) =>
              updateAnswer(
                question._id,
                e.target.value
              )
            }
            placeholder="Type your answer..."
          />
        );

      case "LONG_TEXT":
        return (
          <textarea
            className="feedback-textarea"
            rows="5"
            value={value || ""}
            maxLength={5000}
            onChange={(e) =>
              updateAnswer(
                question._id,
                e.target.value
              )
            }
            placeholder="Share your thoughts..."
          />
        );

      case "EMOJI": {
        const emojis = [
          "😡",
          "😞",
          "😐",
          "🙂",
          "😍",
        ];

        return (
          <div className="feedback-emoji-list">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`feedback-emoji ${
                  value === emoji
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  updateAnswer(
                    question._id,
                    emoji
                  )
                }
              >
                {emoji}
              </button>
            ))}
          </div>
        );
      }

      default:
        return (
          <div className="feedback-inline-error">
            Unsupported question type.
          </div>
        );
    }
  };

  /*
   * ------------------------------------------------
   * LOADING
   * ------------------------------------------------
   */

  if (loading) {
    return (
      <div className="feedback-loading-page">
        <div className="feedback-loading-card">
          <div className="feedback-spinner"></div>

          <h3>
            Loading feedback form
          </h3>

          <p>
            Please wait...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------
   * SUCCESS
   * ------------------------------------------------
   */

  if (success) {
    return (
      <div className="feedback-success-page">
        <div className="feedback-success-card">
          <div className="feedback-success-icon">
            ✓
          </div>

          <div className="feedback-success-content">
            <span className="feedback-success-label">
              Submission complete
            </span>

            <h1>
              Thank you for your feedback
            </h1>

            <p>
              {form?.confirmationMessage ||
                "Your response has been submitted successfully."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------
   * LOAD ERROR
   * ------------------------------------------------
   */

  if (error && !form) {
    return (
      <div className="feedback-error-page">
        <div className="feedback-error-card">
          <div className="feedback-error-icon">
            !
          </div>

          <h2>
            Unable to load feedback
          </h2>

          <p>{error}</p>

          <button
            type="button"
            className="feedback-back-button"
            onClick={() =>
              navigate(
                "/participant-access"
              )
            }
          >
            Back to Access
          </button>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------
   * MAIN
   * ------------------------------------------------
   */

  return (
    <div className="feedback-form-page">

      {/* -----------------------------------------
          TOP BAR
      ----------------------------------------- */}

      <header className="feedback-form-topbar">
        <div className="feedback-form-brand">
          <div className="feedback-form-brand-mark">
            F
          </div>

          <span>
            Feedback Management
          </span>
        </div>

        <div className="feedback-progress-summary">
          <span>
            {answeredCount} of{" "}
            {questions.length} answered
          </span>
        </div>
      </header>

      {/* -----------------------------------------
          MAIN CONTENT
      ----------------------------------------- */}

      <main className="feedback-form-container">

        {/* Form Header */}

        <section className="feedback-form-intro">

          <div className="feedback-form-intro-top">
            <span className="feedback-form-label">
              Feedback Form
            </span>

            {form?.responseMode ===
              "ANONYMOUS" && (
              <span className="feedback-anonymous-badge">
                Anonymous
              </span>
            )}
          </div>

          <h1>
            {form?.title ||
              "Feedback Form"}
          </h1>

          {form?.description && (
            <p>
              {form.description}
            </p>
          )}

          {form?.responseMode ===
            "ANONYMOUS" && (
            <div className="feedback-privacy-notice">
              <span className="privacy-icon">
                ✓
              </span>

              <div>
                <strong>
                  Your response is anonymous
                </strong>

                <p>
                  Your identity will not be
                  displayed with your feedback.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Progress */}

        <div className="feedback-progress">
          <div className="feedback-progress-header">
            <span>
              Your progress
            </span>

            <strong>
              {progress}%
            </strong>
          </div>

          <div className="feedback-progress-track">
            <div
              className="feedback-progress-bar"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {/* Error */}

        {error && (
          <div
            className="feedback-form-error"
            role="alert"
          >
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {/* Questions */}

        {questions.length === 0 ? (
          <div className="feedback-empty">
            <div className="feedback-empty-icon">
              ?
            </div>

            <h3>
              No questions available
            </h3>

            <p>
              This feedback form does not
              currently contain any active
              questions.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
          >
            <div className="feedback-question-list">
              {questions.map(
                (question, index) => (
                  <section
                    className={`feedback-question-card ${
                      answers[
                        question._id
                      ] !== undefined &&
                      answers[
                        question._id
                      ] !== "" &&
                      !(
                        Array.isArray(
                          answers[
                            question._id
                          ]
                        ) &&
                        answers[
                          question._id
                        ].length === 0
                      )
                        ? "answered"
                        : ""
                    }`}
                    key={question._id}
                  >
                    <div className="feedback-question-top">
                      <span className="feedback-question-number">
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </span>

                      <div className="feedback-question-type">
                        {question.type
                          .replaceAll(
                            "_",
                            " "
                          )
                          .toLowerCase()}
                      </div>
                    </div>

                    <h2>
                      {question.questionText}

                      {question.required && (
                        <span className="feedback-required">
                          *
                        </span>
                      )}
                    </h2>

                    <div className="feedback-question-answer">
                      {renderQuestion(
                        question
                      )}
                    </div>
                  </section>
                )
              )}
            </div>

            {/* Submit */}

            <div className="feedback-submit-section">
              <div>
                <strong>
                  Ready to submit?
                </strong>

                <span>
                  Please review your answers
                  before submitting.
                </span>
              </div>

              <button
                type="submit"
                className="feedback-submit-button"
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Feedback"}

                {!submitting && (
                  <span>→</span>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default TakeFeedback;