const StatCard = ({ label, value, description }) => {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>

      <strong className="stat-value">
        {value}
      </strong>

      {description && (
        <span className="stat-description">
          {description}
        </span>
      )}
    </div>
  );
};

export default StatCard;