import { useEffect, useState } from "react";
import Modal from "./Modal";

const LABEL_OVERRIDES = {
  _id: "ID",
  organizationId: "Organization ID",
  formId: "Feedback Form ID",
  groupId: "Group ID",
  participantId: "Participant ID",
  assignmentId: "Assignment ID",
  createdAt: "Created",
  updatedAt: "Updated",
  externalId: "External ID",
  accessType: "Access Method",
  scopeType: "Access Scope",
  responseMode: "Response Mode",
  allowMultipleResponses: "Multiple Responses",
  plainPassword: "Password",
};

const formatLabel = (key) => {
  if (LABEL_OVERRIDES[key]) {
    return LABEL_OVERRIDES[key];
  }

  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const formatValue = (key, value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.join(", ")
      : "—";
  }

  if (typeof value === "object") {
    return null;
  }

  if (
    [
      "createdAt",
      "updatedAt",
      "assignedAt",
      "expiresAt",
      "lastUsedAt",
      "dueDate",
    ].includes(key)
  ) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-IN");
    }
  }

  return String(value);
};

const DetailsContent = ({
  data,
  level = 0,
}) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return (
      <div className="details-value">
        {String(data ?? "—")}
      </div>
    );
  }

  return (
    <div
      className={`details-grid ${
        level
          ? "details-grid-nested"
          : ""
      }`}
    >
      {Object.entries(data)
        .filter(
          ([key]) =>
            key !== "__v" &&
            key !== "passwordHash"
        )
        .map(([key, value]) => {
          const formatted =
            formatValue(
              key,
              value
            );

          return (
            <div
              className="details-field"
              key={`${level}-${key}`}
            >
              <div className="details-label">
                {formatLabel(key)}
              </div>

              {formatted !== null ? (
                <div className="details-value">
                  {formatted}
                </div>
              ) : (
                <div className="details-nested">
                  <DetailsContent
                    data={value}
                    level={
                      level + 1
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

export const ViewDetailsButton = ({
  item,
  label = "View Details",
}) => {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent(
        "feedback:view-details",
        {
          detail: item,
        }
      )
    );
  };

  return (
    <button
      type="button"
      className="btn btn-sm btn-secondary"
      onClick={handleClick}
    >
      {label}
    </button>
  );
};

const DetailsViewer = () => {
  const [item, setItem] =
    useState(null);

  useEffect(() => {
    const handleOpen = (
      event
    ) => {
      setItem(
        event.detail || null
      );
    };

    window.addEventListener(
      "feedback:view-details",
      handleOpen
    );

    return () =>
      window.removeEventListener(
        "feedback:view-details",
        handleOpen
      );
  }, []);

  return (
    <Modal
      open={Boolean(item)}
      title="View Details"
      onClose={() =>
        setItem(null)
      }
      footer={
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() =>
            setItem(null)
          }
        >
          Close
        </button>
      }
    >
      {item ? (
        <DetailsContent
          data={item}
        />
      ) : null}
    </Modal>
  );
};

export default DetailsViewer;