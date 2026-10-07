import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../services/api";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const QUESTION_TYPES = [
  {
    value: "STAR_RATING",
    label: "Star Rating",
  },
  {
    value: "NUMERIC_RATING",
    label: "Numeric Rating",
  },
  {
    value: "MULTIPLE_CHOICE",
    label: "Multiple Choice",
  },
  {
    value: "CHECKBOX",
    label: "Checkbox",
  },
  {
    value: "DROPDOWN",
    label: "Dropdown",
  },
  {
    value: "YES_NO",
    label: "Yes / No",
  },
  {
    value: "SHORT_TEXT",
    label: "Short Text",
  },
  {
    value: "LONG_TEXT",
    label: "Long Text",
  },
  {
    value: "EMOJI",
    label: "Emoji",
  },
];

const OPTION_BASED_TYPES = [
  "MULTIPLE_CHOICE",
  "CHECKBOX",
  "DROPDOWN",
];

const INITIAL_QUESTION = {
  questionText: "",
  type: "STAR_RATING",
  options: [],
  required: true,
  order: 1,
  minValue: 1,
  maxValue: 5,
};

const Questions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const formId = searchParams.get("formId");

  const [questions, setQuestions] = useState([]);
  const [feedbackForm, setFeedbackForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState(null);

  const [saving, setSaving] = useState(false);

  const [validationErrors, setValidationErrors] =
    useState({});

  const [questionData, setQuestionData] =
    useState(INITIAL_QUESTION);

  /**
   * GET FORM
   */
  const fetchForm = async () => {
    try {
      const res = await api.get(
        `/feedback-forms/${formId}`
      );

      setFeedbackForm(
        res.data.form ||
          res.data.data ||
          res.data
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load feedback form."
      );
    }
  };

  /**
   * GET QUESTIONS
   */
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(
        `/questions/form/${formId}`
      );

      const data = res.data;

      const list =
        data.items ||
        data.data ||
        data.questions ||
        [];

      setQuestions(
        Array.isArray(list) ? list : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load questions."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * INITIAL LOAD
   */
  useEffect(() => {
    if (!formId) {
      navigate("/feedback-forms", { replace: true });
      return;
    }

    fetchForm();
    fetchQuestions();
  }, [formId]);

  /**
   * RESET QUESTION
   */
  const resetQuestion = () => {
    setQuestionData({
      ...INITIAL_QUESTION,
      order: questions.length + 1,
    });

    setEditingQuestion(null);
    setValidationErrors({});
  };

  /**
   * OPEN CREATE
   */
  const openCreateModal = () => {
    resetQuestion();
    setError("");
    setModalOpen(true);
  };

  /**
   * OPEN EDIT
   */
  const openEditModal = (question) => {
    if (
      feedbackForm?.status === "CLOSED" ||
      feedbackForm?.status === "ARCHIVED"
    ) {
      setError(
        "Questions cannot be edited for a closed or archived form."
      );
      return;
    }

    setEditingQuestion(question);

    setQuestionData({
      questionText:
        question.questionText || "",

      type:
        question.type ||
        "STAR_RATING",

      options:
        Array.isArray(question.options)
          ? [...question.options]
          : [],

      required:
        Boolean(question.required),

      order:
        Number(question.order) || 1,

      minValue:
        question.minValue ?? 1,

      maxValue:
        question.maxValue ?? 5,
    });

    setValidationErrors({});
    setError("");
    setModalOpen(true);
  };

  /**
   * HANDLE BASIC FIELD CHANGE
   */
  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    let nextValue = value;

    if (type === "checkbox") {
      nextValue = checked;
    }

    if (
      name === "order" ||
      name === "minValue" ||
      name === "maxValue"
    ) {
      nextValue =
        value === "" ? "" : Number(value);
    }

    setQuestionData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    setValidationErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setError("");
  };

  /**
   * QUESTION TYPE CHANGE
   */
  const handleTypeChange = (e) => {
    const type = e.target.value;

    let options = [];

    if (OPTION_BASED_TYPES.includes(type)) {
      options = ["", ""];
    }

    setQuestionData((prev) => ({
      ...prev,
      type,
      options,
      minValue:
        type === "NUMERIC_RATING"
          ? 1
          : prev.minValue,
      maxValue:
        type === "NUMERIC_RATING"
          ? 5
          : prev.maxValue,
    }));

    setValidationErrors((prev) => ({
      ...prev,
      type: "",
      options: "",
      minValue: "",
      maxValue: "",
    }));

    setError("");
  };

  /**
   * ADD OPTION
   */
  const addOption = () => {
    setQuestionData((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        "",
      ],
    }));
  };

  /**
   * UPDATE OPTION
   */
  const updateOption = (
    index,
    value
  ) => {
    setQuestionData((prev) => {
      const updatedOptions = [
        ...prev.options,
      ];

      updatedOptions[index] =
        value;

      return {
        ...prev,
        options: updatedOptions,
      };
    });

    setValidationErrors((prev) => ({
      ...prev,
      options: "",
    }));
  };

  /**
   * REMOVE OPTION
   */
  const removeOption = (index) => {
    setQuestionData((prev) => ({
      ...prev,
      options: prev.options.filter(
        (_, optionIndex) =>
          optionIndex !== index
      ),
    }));
  };

  /**
   * VALIDATE QUESTION
   */
  const validateQuestion = () => {
    const errors = {};

    const questionText =
      questionData.questionText.trim();

    /**
     * QUESTION TEXT
     */
    if (!questionText) {
      errors.questionText =
        "Question is required.";
    } else if (
      questionText.length > 500
    ) {
      errors.questionText =
        "Question cannot exceed 500 characters.";
    }

    /**
     * TYPE
     */
    if (
      !QUESTION_TYPES.some(
        (item) =>
          item.value === questionData.type
      )
    ) {
      errors.type =
        "Invalid question type.";
    }

    /**
     * ORDER
     */
    const order =
      Number(questionData.order);

    if (
      !Number.isInteger(order) ||
      order < 1
    ) {
      errors.order =
        "Display order must be a whole number greater than 0.";
    }

    /**
     * DUPLICATE ORDER
     *
     * Frontend check.
     * Backend performs the authoritative check.
     */
    if (
      Number.isInteger(order) &&
      order >= 1
    ) {
      const duplicateOrder =
        questions.some(
          (question) =>
            Number(question.order) ===
              order &&
            question._id !==
              editingQuestion?._id
        );

      if (duplicateOrder) {
        errors.order =
          "Another question already uses this display order.";
      }
    }

    /**
     * OPTION QUESTIONS
     */
    if (
      OPTION_BASED_TYPES.includes(
        questionData.type
      )
    ) {
      const cleanedOptions =
        questionData.options
          .map((option) =>
            String(option).trim()
          )
          .filter(Boolean);

      if (cleanedOptions.length < 2) {
        errors.options =
          "At least two options are required.";
      }

      const normalizedOptions =
        cleanedOptions.map((option) =>
          option.toLowerCase()
        );

      const hasDuplicateOptions =
        new Set(
          normalizedOptions
        ).size !==
        normalizedOptions.length;

      if (hasDuplicateOptions) {
        errors.options =
          "Options must be unique.";
      }

      if (
        cleanedOptions.some(
          (option) =>
            option.length > 200
        )
      ) {
        errors.options =
          "Each option cannot exceed 200 characters.";
      }
    }

    /**
     * NUMERIC RATING
     */
    if (
      questionData.type ===
      "NUMERIC_RATING"
    ) {
      const min =
        Number(questionData.minValue);

      const max =
        Number(questionData.maxValue);

      if (
        !Number.isFinite(min)
      ) {
        errors.minValue =
          "Minimum value is required.";
      }

      if (
        !Number.isFinite(max)
      ) {
        errors.maxValue =
          "Maximum value is required.";
      }

      if (
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min >= max
      ) {
        errors.maxValue =
          "Maximum value must be greater than minimum value.";
      }
    }

    /**
     * STAR RATING
     */
    if (
      questionData.type ===
      "STAR_RATING"
    ) {
      if (
        Number(questionData.minValue) !==
          1 ||
        Number(questionData.maxValue) !==
          5
      ) {
        errors.type =
          "Star Rating uses a 1–5 scale.";
      }
    }

    setValidationErrors(errors);

    return (
      Object.keys(errors).length === 0
    );
  };

  /**
   * CREATE / UPDATE
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!validateQuestion()) {
      return;
    }

    try {
      setSaving(true);

      const cleanedOptions =
        questionData.options
          .map((option) =>
            String(option).trim()
          )
          .filter(Boolean);

      const payload = {
        formId,

        questionText:
          questionData.questionText.trim(),

        type:
          questionData.type,

        options:
          OPTION_BASED_TYPES.includes(
            questionData.type
          )
            ? cleanedOptions
            : [],

        required:
          Boolean(
            questionData.required
          ),

        order:
          Number(questionData.order),

        minValue:
          questionData.type ===
          "NUMERIC_RATING"
            ? Number(
                questionData.minValue
              )
            : questionData.type ===
              "STAR_RATING"
            ? 1
            : null,

        maxValue:
          questionData.type ===
          "NUMERIC_RATING"
            ? Number(
                questionData.maxValue
              )
            : questionData.type ===
              "STAR_RATING"
            ? 5
            : null,
      };

      if (editingQuestion) {
        await api.patch(
          `/questions/${editingQuestion._id}`,
          payload
        );
      } else {
        await api.post(
          "/questions",
          payload
        );
      }

      setModalOpen(false);
      resetQuestion();

      await fetchQuestions();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save question."
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * TOGGLE STATUS
   */
  const toggleStatus = async (
    question
  ) => {
    if (
      feedbackForm?.status ===
        "CLOSED" ||
      feedbackForm?.status ===
        "ARCHIVED"
    ) {
      setError(
        "Question status cannot be changed for a closed or archived form."
      );
      return;
    }

    try {
      setError("");

      const nextStatus =
        question.status === "ACTIVE"
          ? "INACTIVE"
          : "ACTIVE";

      await api.patch(
        `/questions/${question._id}/status`,
        {
          status: nextStatus,
        }
      );

      await fetchQuestions();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update question status."
      );
    }
  };

  /**
   * QUESTION TYPE LABEL
   */
  const getQuestionTypeLabel = (
    type
  ) => {
    const questionType =
      QUESTION_TYPES.find(
        (item) =>
          item.value === type
      );

    return (
      questionType?.label ||
      type
    );
  };

  /**
   * CLOSE MODAL
   */
  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    resetQuestion();
  };

  /**
   * MISSING FORM ID
   */
  if (!formId) {
    return (
      <div className="page">
        <div className="error-box">
          Feedback form ID is missing.
        </div>

        <Button
          onClick={() =>
            navigate(
              "/feedback-forms"
            )
          }
        >
          Back to Feedback Forms
        </Button>
      </div>
    );
  }

  /**
   * SORT WITHOUT MUTATING STATE
   */
  const sortedQuestions = [
    ...questions,
  ].sort(
    (a, b) =>
      (a.order || 0) -
      (b.order || 0)
  );

  const formIsLocked =
    feedbackForm?.status ===
      "CLOSED" ||
    feedbackForm?.status ===
      "ARCHIVED";

  return (
    <div className="page">
      {/* HEADER */}
      <div className="page-head">
        <div>
          <h1>
            Questions
            {feedbackForm?.title
              ? ` — ${feedbackForm.title}`
              : ""}
          </h1>

          <p>
            Create and manage questions
            for this feedback form.
          </p>
        </div>

        <div className="table-actions">
          <Button
            variant="secondary"
            onClick={() =>
              navigate(
                "/feedback-forms"
              )
            }
          >
            Back
          </Button>

          <Button
            onClick={openCreateModal}
            disabled={formIsLocked}
          >
            + Add Question
          </Button>
        </div>
      </div>

      {/* FORM STATUS INFORMATION */}
      {formIsLocked && (
        <div className="info-box">
          Questions cannot be modified because
          this form is{" "}
          <strong>
            {feedbackForm?.status}
          </strong>
          .
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <Loading />
      ) : questions.length === 0 ? (
        <EmptyState
          title="No questions found"
          message="Add questions to build this feedback form."
          action={
            <Button
              onClick={
                openCreateModal
              }
              disabled={formIsLocked}
            >
              Add Question
            </Button>
          }
        />
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {sortedQuestions.map(
                  (question) => (
                    <tr
                      key={
                        question._id
                      }
                    >
                      <td>
                        {question.order}
                      </td>

                      <td>
                        <strong>
                          {
                            question.questionText
                          }
                        </strong>
                      </td>

                      <td>
                        {getQuestionTypeLabel(
                          question.type
                        )}
                      </td>

                      <td>
                        {question.required
                          ? "Yes"
                          : "No"}
                      </td>

                      <td>
                        <Badge
                          variant={
                            question.status ===
                            "ACTIVE"
                              ? "success"
                              : "default"
                          }
                        >
                          {
                            question.status
                          }
                        </Badge>
                      </td>

                      <td>
                        <div className="table-actions">
                          <ViewDetailsButton item={question} />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              openEditModal(
                                question
                              )
                            }
                            disabled={
                              formIsLocked
                            }
                          >
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              toggleStatus(
                                question
                              )
                            }
                            disabled={
                              formIsLocked
                            }
                          >
                            {question.status ===
                            "ACTIVE"
                              ? "Deactivate"
                              : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUESTION MODAL */}
      <Modal
        open={modalOpen}
        title={
          editingQuestion
            ? "Edit Question"
            : "Add Question"
        }
        onClose={closeModal}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={
                closeModal
              }
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="question-form"
              disabled={
                saving ||
                formIsLocked
              }
            >
              {saving
                ? "Saving..."
                : editingQuestion
                ? "Update Question"
                : "Save Question"}
            </Button>
          </>
        }
      >
        <form
          id="question-form"
          onSubmit={handleSubmit}
        >
          {/* QUESTION */}
          <Input
            label="Question"
            name="questionText"
            value={
              questionData.questionText
            }
            onChange={handleChange}
            placeholder="Enter your question"
            required
            maxLength={500}
            error={
              validationErrors.questionText
            }
          />

          {/* TYPE */}
          <Select
            label="Question Type"
            name="type"
            value={
              questionData.type
            }
            onChange={
              handleTypeChange
            }
            required
            error={
              validationErrors.type
            }
          >
            {QUESTION_TYPES.map(
              (type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              )
            )}
          </Select>

          {/* ORDER + REQUIRED */}
          <div className="form-grid">
            <Input
              label="Display Order"
              name="order"
              type="number"
              min="1"
              step="1"
              value={
                questionData.order
              }
              onChange={
                handleChange
              }
              required
              error={
                validationErrors.order
              }
            />

            <div className="form-field">
              <label>
                Required
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="required"
                  checked={
                    questionData.required
                  }
                  onChange={
                    handleChange
                  }
                />

                <span>
                  Participant must
                  answer this question
                </span>
              </label>
            </div>
          </div>

          {/* NUMERIC RATING */}
          {questionData.type ===
            "NUMERIC_RATING" && (
            <div className="form-grid">
              <Input
                label="Minimum Value"
                name="minValue"
                type="number"
                step="any"
                value={
                  questionData.minValue
                }
                onChange={
                  handleChange
                }
                required
                error={
                  validationErrors.minValue
                }
              />

              <Input
                label="Maximum Value"
                name="maxValue"
                type="number"
                step="any"
                value={
                  questionData.maxValue
                }
                onChange={
                  handleChange
                }
                required
                error={
                  validationErrors.maxValue
                }
              />
            </div>
          )}

          {/* OPTIONS */}
          {OPTION_BASED_TYPES.includes(
            questionData.type
          ) && (
            <div className="question-options">
              <div className="section-title">
                <strong>
                  Options
                </strong>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={
                    addOption
                  }
                >
                  + Add Option
                </Button>
              </div>

              {questionData.options.map(
                (
                  option,
                  index
                ) => (
                  <div
                    className="option-row"
                    key={index}
                  >
                    <Input
                      label={`Option ${
                        index + 1
                      }`}
                      value={
                        option
                      }
                      onChange={(
                        e
                      ) =>
                        updateOption(
                          index,
                          e
                            .target
                            .value
                        )
                      }
                      placeholder={`Option ${
                        index + 1
                      }`}
                      maxLength={
                        200
                      }
                    />

                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        removeOption(
                          index
                        )
                      }
                      disabled={
                        questionData
                          .options
                          .length <=
                        2
                      }
                    >
                      Remove
                    </Button>
                  </div>
                )
              )}

              {validationErrors.options && (
                <div className="field-error">
                  {
                    validationErrors.options
                  }
                </div>
              )}
            </div>
          )}

          {/* STAR RATING */}
          {questionData.type ===
            "STAR_RATING" && (
            <div className="info-box">
              Star Rating uses a{" "}
              <strong>
                1–5 star scale
              </strong>
              .
            </div>
          )}

          {/* YES / NO */}
          {questionData.type ===
            "YES_NO" && (
            <div className="info-box">
              Participants will select{" "}
              <strong>
                Yes
              </strong>{" "}
              or{" "}
              <strong>
                No
              </strong>
              .
            </div>
          )}

          {/* SHORT TEXT */}
          {questionData.type ===
            "SHORT_TEXT" && (
            <div className="info-box">
              Participants can provide
              a short text response.
            </div>
          )}

          {/* LONG TEXT */}
          {questionData.type ===
            "LONG_TEXT" && (
            <div className="info-box">
              Participants can provide
              a detailed text response.
            </div>
          )}

          {/* EMOJI */}
          {questionData.type ===
            "EMOJI" && (
            <div className="info-box">
              Participants will provide
              an emoji response.
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Questions;