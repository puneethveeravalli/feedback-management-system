const EmptyState = ({
  title = "No data found",
  description,
  message,
  action,
}) => {
  const displayDescription =
    description ?? message;

  return (
    <div className="empty-state">
      <h3>{title}</h3>

      {displayDescription && (
        <p>{displayDescription}</p>
      )}

      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;