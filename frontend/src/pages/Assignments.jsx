import { useEffect, useState } from "react";
import api from "../services/api";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const INITIAL_FORM = { formId: "", groupId: "" };

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [forms, setForms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [validationErrors, setValidationErrors] = useState({});

  const getId = (value) => value && typeof value === "object" ? value._id : value;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [assignmentResponse, formResponse, groupResponse] = await Promise.all([
        api.get("/assignments"),
        api.get("/feedback-forms"),
        api.get("/groups"),
      ]);
      setAssignments(assignmentResponse.data?.assignments || []);
      setForms(formResponse.data?.forms || []);
      setGroups(groupResponse.data?.groups || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assignment data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const reset = () => {
    setFormData(INITIAL_FORM);
    setEditing(null);
    setValidationErrors({});
  };

  const openCreate = () => { reset(); setError(""); setModalOpen(true); };

  const openEdit = (assignment) => {
    setEditing(assignment);
    setFormData({ formId: getId(assignment.formId), groupId: getId(assignment.groupId) });
    setValidationErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errors = {};
    const form = forms.find((item) => item._id === formData.formId);
    const group = groups.find((item) => item._id === formData.groupId);
    if (!formData.formId) errors.formId = "Feedback form is required.";
    else if (!form) errors.formId = "Selected form is invalid.";
    else if (["CLOSED", "ARCHIVED"].includes(form.status)) errors.formId = "Closed or archived forms cannot be assigned.";
    if (!formData.groupId) errors.groupId = "Group is required.";
    else if (!group) errors.groupId = "Selected group is invalid.";
    else if (group.status !== "ACTIVE") errors.groupId = "Only active groups can be assigned.";

    const duplicate = assignments.some((assignment) =>
      assignment._id !== editing?._id &&
      getId(assignment.formId) === formData.formId &&
      getId(assignment.groupId) === formData.groupId
    );
    if (duplicate) errors.formId = "This form is already assigned to the selected group.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = { formId: formData.formId, groupId: formData.groupId };
      if (editing) await api.patch(`/assignments/${editing._id}`, payload);
      else await api.post("/assignments", payload);
      setModalOpen(false);
      reset();
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save assignment.");
    } finally { setSaving(false); }
  };

  const toggleStatus = async (assignment) => {
    try {
      await api.patch(`/assignments/${assignment._id}/status`, { status: assignment.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || "Failed to update assignment."); }
  };

  const formName = (a) => a.formId?.title || forms.find((f) => f._id === getId(a.formId))?.title || "—";
  const groupName = (a) => a.groupId?.name || groups.find((g) => g._id === getId(a.groupId))?.name || "—";

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Assignments</h1><p>Assign feedback forms directly to groups.</p></div>
        <Button onClick={openCreate}>+ Create Assignment</Button>
      </div>
      {error && <div className="error-box">{error}</div>}
      {loading ? <Loading /> : assignments.length === 0 ? (
        <EmptyState title="No assignments found" description="Assign a feedback form to a group to make it available to participants." action={<Button onClick={openCreate}>Create Assignment</Button>} />
      ) : (
        <div className="table-card"><div className="table-wrap"><table>
          <thead><tr><th>Feedback Form</th><th>Group</th><th>Status</th><th>Assigned</th><th>Actions</th></tr></thead>
          <tbody>{assignments.map((assignment) => <tr key={assignment._id}>
            <td><strong>{formName(assignment)}</strong></td>
            <td>{groupName(assignment)}</td>
            <td><Badge status={assignment.status} /></td>
            <td>{assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString("en-IN") : "—"}</td>
            <td><div className="table-actions"><ViewDetailsButton item={assignment} /><Button size="sm" variant="secondary" onClick={() => openEdit(assignment)}>Edit</Button><Button size="sm" variant={assignment.status === "ACTIVE" ? "danger" : "primary"} onClick={() => toggleStatus(assignment)}>{assignment.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button></div></td>
          </tr>)}</tbody>
        </table></div></div>
      )}

      <Modal open={modalOpen} title={editing ? "Edit Assignment" : "Create Assignment"} onClose={() => !saving && setModalOpen(false)} footer={<><Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" form="assignment-form" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button></>}>
        <form id="assignment-form" onSubmit={submit}>
          <Select label="Feedback Form" value={formData.formId} onChange={(e) => setFormData({ ...formData, formId: e.target.value })} error={validationErrors.formId} required>
            <option value="">Select feedback form</option>
            {forms.filter((form) => !["CLOSED", "ARCHIVED"].includes(form.status) || form._id === formData.formId).map((form) => <option key={form._id} value={form._id}>{form.title} — {form.status}</option>)}
          </Select>
          <Select label="Group" value={formData.groupId} onChange={(e) => setFormData({ ...formData, groupId: e.target.value })} error={validationErrors.groupId} required>
            <option value="">Select group</option>
            {groups.filter((group) => group.status === "ACTIVE" || group._id === formData.groupId).map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}
          </Select>
          <div className="info-box"><strong>Assignment rule</strong><p>Participants receive this feedback through their group membership. No target is required.</p></div>
        </form>
      </Modal>
    </div>
  );
};

export default Assignments;
