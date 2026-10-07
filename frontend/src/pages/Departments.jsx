import EntityPage from "../components/ui/EntityPage";

const validateDepartment = (form) => {
  const errors = {};

  const name = String(form.name || "").trim();
  const description = String(
    form.description || ""
  ).trim();

  if (!name) {
    errors.name = "Department name is required.";
  } else if (name.length < 2) {
    errors.name =
      "Department name must contain at least 2 characters.";
  } else if (name.length > 100) {
    errors.name =
      "Department name cannot exceed 100 characters.";
  }

  if (description.length > 500) {
    errors.description =
      "Description cannot exceed 500 characters.";
  }

  return errors;
};

const Departments = () => {
  return (
    <EntityPage
      title="Departments"
      description="Manage departments within your organization."
      endpoint="/departments"
      fields={[
        {
          name: "name",
          label: "Department Name",
          required: true,
          placeholder: "Enter department name",
          maxLength: 100,
        },
        {
          name: "description",
          label: "Description",
          placeholder:
            "Enter a short description",
          maxLength: 500,
        },
      ]}
      columns={[
        {
          key: "name",
          label: "Name",
        },
        {
          key: "description",
          label: "Description",
        },
        {
          key: "status",
          label: "Status",
        },
      ]}
      validate={validateDepartment}
      getPayload={(form) => ({
        name: String(form.name || "").trim(),
        description: String(
          form.description || ""
        ).trim(),
      })}
    />
  );
};

export default Departments;