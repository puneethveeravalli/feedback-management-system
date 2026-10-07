const Modal = ({
  open,
  title,
  children,
  onClose,
  footer,
  size = "medium",
}) => {
  if (!open) {
    return null;
  }

  const handleOverlayClick = (event) => {
    if (
      event.target === event.currentTarget
    ) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={handleOverlayClick}
    >
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}

        <div className="modal-header">
          <div>
            <h2 id="modal-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}

        <div className="modal-body">
          {children}
        </div>

        {/* Optional Footer */}

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;