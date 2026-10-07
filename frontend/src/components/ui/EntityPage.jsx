import { useEffect, useState } from "react";
import api from "../../services/api";

import Button from "./Button";
import Input from "./Input";
import Select from "./Select";
import Badge from "./Badge";
import Loading from "./Loading";
import EmptyState from "./EmptyState";
import Modal from "./Modal";
import { ViewDetailsButton } from "./DetailsViewer";

const getDefaultList = (data) => {
  if (Array.isArray(data)) return data;

  return (
    data?.items ||
    data?.data ||
    data?.departments ||
    data?.groups ||
    data?.participants ||
    data?.targets ||
    data?.forms ||
    data?.assignments ||
    data?.actions ||
    []
  );
};

const EntityPage = ({
  title,
  description,
  endpoint,
  fields = [],
  columns = [],
  getPayload,
  getItemName = (item) => item.name || "this record",
  getList,
  statusField = "status",
  statusValues = ["ACTIVE", "INACTIVE"],
  enableStatusToggle = true,
  createLabel = "Create",
  editLabel = "Edit",
  validate,
}) => {
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] =
    useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(endpoint);

        const list = getList
          ? getList(response.data)
          : getDefaultList(response.data);

        if (isMounted) {
          setItems(
            Array.isArray(list) ? list : []
          );
        }
      } catch (err) {
        if (isMounted) {
          setItems([]);

          setError(
            err.response?.data?.message ||
              `Unable to load ${title.toLowerCase()}.`
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [endpoint, title, getList]);

  const loadItemsAgain = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(endpoint);

      const list = getList
        ? getList(response.data)
        : getDefaultList(response.data);

      setItems(
        Array.isArray(list) ? list : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Unable to load ${title.toLowerCase()}.`
      );
    } finally {
      setLoading(false);
    }
  };

  const getInitialForm = (item = null) => {
    const initial = {};

    fields.forEach((field) => {
      initial[field.name] =
        item?.[field.name] ??
        field.defaultValue ??
        "";
    });

    return initial;
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm(getInitialForm());
    setFormErrors({});
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm(getInitialForm(item));
    setFormErrors({});
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingItem(null);
    setForm({});
    setFormErrors({});
  };

  const handleChange = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setFormErrors({});

    if (validate) {
      const validationErrors = validate(
        form,
        editingItem
      );

      if (
        validationErrors &&
        Object.keys(validationErrors).length > 0
      ) {
        setFormErrors(validationErrors);
        return;
      }
    }

    try {
      setSaving(true);

      const payload = getPayload
        ? getPayload(form, editingItem)
        : form;

      if (editingItem) {
        await api.patch(
          `${endpoint}/${editingItem._id}`,
          payload
        );

        setSuccess(
          `${title.replace(
            /s$/,
            ""
          )} updated successfully.`
        );
      } else {
        await api.post(endpoint, payload);

        setSuccess(
          `${title.replace(
            /s$/,
            ""
          )} created successfully.`
        );
      }

      setModalOpen(false);
      setEditingItem(null);
      setForm({});
      setFormErrors({});

      await loadItemsAgain();
    } catch (err) {
      const responseData = err.response?.data;

      if (responseData?.errors) {
        setFormErrors(responseData.errors);
      }

      setError(
        responseData?.message ||
          `Unable to ${
            editingItem
              ? "update"
              : "create"
          } ${title
            .replace(/s$/, "")
            .toLowerCase()}.`
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item) => {
    if (!enableStatusToggle) return;

    const currentStatus =
      item[statusField];

    if (
      !statusValues.includes(currentStatus)
    ) {
      return;
    }

    const nextStatus =
      currentStatus === statusValues[0]
        ? statusValues[1]
        : statusValues[0];

    const itemName = getItemName(item);

    const confirmed = window.confirm(
      `${
        nextStatus === "ACTIVE"
          ? "Activate"
          : "Deactivate"
      } ${itemName}?`
    );

    if (!confirmed) return;

    try {
      setStatusUpdatingId(item._id);
      setError("");
      setSuccess("");

      await api.patch(
        `${endpoint}/${item._id}/status`,
        {
          status: nextStatus,
        }
      );

      setSuccess(
        `${itemName} ${
          nextStatus === "ACTIVE"
            ? "activated"
            : "deactivated"
        } successfully.`
      );

      await loadItemsAgain();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update status."
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const renderField = (field) => {
    const value = form[field.name] ?? "";

    if (field.type === "select") {
      return (
        <Select
          key={field.name}
          label={field.label}
          name={field.name}
          value={value}
          required={field.required}
          disabled={
            saving || field.disabled
          }
          error={formErrors[field.name]}
          onChange={(event) =>
            handleChange(
              field.name,
              event.target.value
            )
          }
        >
          <option value="">
            {field.placeholder ||
              `Select ${field.label}`}
          </option>

          {field.options?.map((option) => {
            const optionValue =
              typeof option === "object"
                ? option.value
                : option;

            const optionLabel =
              typeof option === "object"
                ? option.label
                : option;

            return (
              <option
                key={optionValue}
                value={optionValue}
              >
                {optionLabel}
              </option>
            );
          })}
        </Select>
      );
    }

    return (
      <Input
        key={field.name}
        label={field.label}
        name={field.name}
        type={field.type || "text"}
        value={value}
        placeholder={
          field.placeholder || ""
        }
        required={field.required}
        disabled={
          saving || field.disabled
        }
        min={field.min}
        max={field.max}
        step={field.step}
        minLength={field.minLength}
        maxLength={field.maxLength}
        error={formErrors[field.name]}
        onChange={(event) =>
          handleChange(
            field.name,
            event.target.value
          )
        }
      />
    );
  };

  const renderCell = (item, column) => {
    if (column.render) {
      return column.render(item);
    }

    const value = item[column.key];

    if (column.key === statusField) {
      return <Badge status={value} />;
    }

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return value;
  };

  const singularTitle =
    title.replace(/s$/, "");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>

          {description && (
            <p>{description}</p>
          )}
        </div>

        <Button onClick={openCreate}>
          + {createLabel}
        </Button>
      </div>

      {error && !modalOpen && (
        <div className="error-box">
          {error}
        </div>
      )}

      {success && !modalOpen && (
        <div className="success-box">
          {success}
        </div>
      )}

      <div className="card table-card">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState
            title={`No ${title.toLowerCase()} yet`}
            description={`Create your first ${singularTitle.toLowerCase()} to get started.`}
            action={
              <Button onClick={openCreate}>
                + {createLabel}
              </Button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>
                      {column.label}
                    </th>
                  ))}

                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    {columns.map((column) => (
                      <td key={column.key}>
                        {renderCell(
                          item,
                          column
                        )}
                      </td>
                    ))}

                    <td>
                      <div className="table-actions">
                        <ViewDetailsButton item={item} />

                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={
                            saving ||
                            statusUpdatingId ===
                              item._id
                          }
                          onClick={() =>
                            openEdit(item)
                          }
                        >
                          {editLabel}
                        </Button>

                        {enableStatusToggle &&
                          item[statusField] &&
                          statusValues.includes(
                            item[statusField]
                          ) && (
                            <Button
                              size="sm"
                              variant={
                                item[
                                  statusField
                                ] === "ACTIVE"
                                  ? "danger"
                                  : "secondary"
                              }
                              disabled={
                                statusUpdatingId ===
                                item._id
                              }
                              onClick={() =>
                                toggleStatus(
                                  item
                                )
                              }
                            >
                              {statusUpdatingId ===
                              item._id
                                ? "Updating..."
                                : item[
                                    statusField
                                  ] === "ACTIVE"
                                ? "Deactivate"
                                : "Activate"}
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={
          editingItem
            ? `Edit ${singularTitle}`
            : `Create ${singularTitle}`
        }
        onClose={closeModal}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="entity-form"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingItem
                ? "Update"
                : "Create"}
            </Button>
          </>
        }
      >
        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form
          id="entity-form"
          onSubmit={handleSubmit}
          className="form-grid"
          noValidate
        >
          {fields.map(renderField)}
        </form>
      </Modal>
    </div>
  );
};

export default EntityPage;