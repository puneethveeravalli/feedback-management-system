const Input = ({
  label,
  name,
  type = "text",
  value = "",
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  min,
  max,
  step,
  minLength,
  maxLength,
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

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        minLength={minLength}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${name}-error` : undefined
        }
      />

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

export default Input;