const Loading = ({ text = "Loading..." }) => {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <span>{text}</span>
    </div>
  );
};

export default Loading;