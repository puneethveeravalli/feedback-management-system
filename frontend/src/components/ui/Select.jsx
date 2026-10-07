const Select = ({
  label,
  name,
  value = "",
  onChange,
  children,
  required = false,
  disabled = false,
  error = "",
}) => {
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={name}>
          {label}

          {required && (
            <span className="required">
              *
            </span>
          )}
        </label>
      )}

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${name}-error` : undefined
        }
      >
        {children}
      </select>

      {error && (
        <span
          id={`${name}-error`}
          className="field-error"
        >
          {error}
        </span>
      )}
    </div>
  );
};

export default Select;