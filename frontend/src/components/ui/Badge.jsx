const STATUS_LABELS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_VARIANTS = {
  ACTIVE: "success",
  INACTIVE: "default",
  DRAFT: "default",
  PUBLISHED: "info",
  CLOSED: "warning",
  ARCHIVED: "danger",
  OPEN: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const Badge = ({
  status,
  variant,
  children,
}) => {
  const normalizedStatus = String(
    status || ""
  ).toUpperCase();

  const resolvedVariant =
    variant ||
    STATUS_VARIANTS[normalizedStatus] ||
    "default";

  const label =
    children ||
    STATUS_LABELS[normalizedStatus] ||
    status ||
    "—";

  return (
    <span
      className={`badge badge-${String(
        resolvedVariant
      ).toLowerCase()}`}
    >
      {label}
    </span>
  );
};

export default Badge;