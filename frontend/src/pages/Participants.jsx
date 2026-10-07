import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import api from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const INITIAL_FORM = { name: "", email: "", groupId: "" };

const Participants = () => {
  const [participants, setParticipants] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [participantsResponse, groupsResponse] = await Promise.all([
        api.get("/participants"),
        api.get("/groups"),
      ]);
      setParticipants(participantsResponse.data?.participants || []);
      setGroups(groupsResponse.data?.groups || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load participants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setFormErrors({});
    setEditingParticipant(null);
  };

  const openCreate = () => {
    resetForm();
    setCreatedCredentials(null);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEdit = (participant) => {
    setEditingParticipant(participant);
    setForm({
      name: participant.name || "",
      email: participant.email || "",
      groupId: participant.groupId?._id || participant.groupId || "",
    });
    setFormErrors({});
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Participant name is required.";
    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
    if (!form.groupId) errors.groupId = "Group is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!validateForm()) return;

    try {
      setSaving(true);
      if (editingParticipant) {
        await api.patch(`/participants/${editingParticipant._id}`, {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          groupId: form.groupId,
        });
        setSuccess("Participant updated successfully.");
      } else {
        const response = await api.post("/participants", {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          groupId: form.groupId,
        });
        setCreatedCredentials(response.data?.credentials || null);
        setSuccess("Participant created successfully.");
      }
      setModalOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save participant.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (participant) => {
    const nextStatus = participant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!window.confirm(`${nextStatus === "ACTIVE" ? "Activate" : "Deactivate"} ${participant.name}?`)) return;
    try {
      setStatusUpdatingId(participant._id);
      await api.patch(`/participants/${participant._id}/status`, { status: nextStatus });
      setSuccess(`Participant ${nextStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update participant status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const getGroupName = (participant) => participant.groupId?.name || groups.find((g) => g._id === participant.groupId)?.name || "—";

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess("Copied to clipboard.");
    } catch {
      window.prompt("Copy this information:", text);
    }
  };

  const downloadTemplate = () => {
    const rows = [
      { name: "Ravi Kumar", email: "ravi@example.com", group: groups[0]?.name || "Group A" },
    ];
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Participants");
    XLSX.writeFile(workbook, "participants-template.xlsx");
  };

  const readBulkFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const handleBulkFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setBulkSaving(true);
      setError("");
      setSuccess("");
      setBulkResult(null);
      const rows = await readBulkFile(file);
      if (!rows.length) throw new Error("The uploaded file is empty.");

      const normalized = rows.map((row) => ({
        name: row.name || row.Name || "",
        email: row.email || row.Email || "",
        group: row.group || row.Group || row.groupName || row.GroupName || row.groupId || row.GroupId || "",
      }));

      const response = await api.post("/participants/bulk", { participants: normalized });
      setBulkResult(response.data);
      setSuccess(response.data?.message || "Bulk import completed.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to import participants.");
    } finally {
      setBulkSaving(false);
      event.target.value = "";
    }
  };

  const credentialText = createdCredentials
    ? `Name: ${createdCredentials.name}\nExternal ID: ${createdCredentials.externalId}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
    : "";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Participants</h1>
          <p>Manage participants, groups and automatically generated credentials.</p>
        </div>
        <div className="page-head-actions">
          <Button variant="secondary" onClick={() => { setBulkModalOpen(true); setBulkResult(null); setError(""); }}>Bulk Upload</Button>
          <Button onClick={openCreate}>+ Create Participant</Button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      {createdCredentials && (
        <div className="card credential-result">
          <div>
            <h3>Participant Credentials</h3>
            <p>External ID and password were generated automatically.</p>
          </div>
          <pre className="credential-value">{credentialText}</pre>
          <Button size="sm" onClick={() => copyText(credentialText)}>Copy Credentials</Button>
        </div>
      )}

      {loading ? <Loading /> : participants.length === 0 ? (
        <EmptyState title="No participants found" description="Create one participant or import many participants from Excel/CSV." action={<Button onClick={openCreate}>Create Participant</Button>} />
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>External ID</th><th>Name</th><th>Email</th><th>Group</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={participant._id}>
                    <td><strong>{participant.externalId || "—"}</strong></td>
                    <td>{participant.name}</td>
                    <td>{participant.email}</td>
                    <td>{getGroupName(participant)}</td>
                    <td><Badge status={participant.status} /></td>
                    <td>
                      <div className="table-actions">
                        <ViewDetailsButton item={participant} />
                        <Button size="sm" variant="secondary" onClick={() => openEdit(participant)}>Edit</Button>
                        <Button size="sm" variant={participant.status === "ACTIVE" ? "danger" : "primary"} onClick={() => toggleStatus(participant)} disabled={statusUpdatingId === participant._id}>
                          {statusUpdatingId === participant._id ? "Saving..." : participant.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingParticipant ? "Edit Participant" : "Create Participant"}
        onClose={() => { if (!saving) { setModalOpen(false); resetForm(); } }}
        footer={<><Button variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }} disabled={saving}>Cancel</Button><Button type="submit" form="participant-form" disabled={saving}>{saving ? "Saving..." : editingParticipant ? "Update" : "Create"}</Button></>}
      >
        <form id="participant-form" onSubmit={handleSubmit}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={formErrors.name} required maxLength={150} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={formErrors.email} required maxLength={150} />
          <Select label="Group" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} error={formErrors.groupId} required>
            <option value="">Select group</option>
            {groups.filter((group) => group.status === "ACTIVE").map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}
          </Select>
          {!editingParticipant && <div className="info-box"><strong>Automatic credentials</strong><p>External ID and login password are generated by the system after creation.</p></div>}
          {editingParticipant && <div className="info-box"><strong>External ID: {editingParticipant.externalId}</strong><p>External IDs are system-generated and cannot be edited.</p></div>}
        </form>
      </Modal>

      <Modal
        open={bulkModalOpen}
        title="Bulk Upload Participants"
        onClose={() => !bulkSaving && setBulkModalOpen(false)}
        footer={<Button variant="secondary" onClick={() => setBulkModalOpen(false)} disabled={bulkSaving}>Close</Button>}
      >
        <div className="bulk-upload-content">
          <div className="info-box"><strong>File columns</strong><p>Use <code>name</code>, <code>email</code> and <code>group</code>. External ID and password are generated automatically.</p></div>
          <div className="bulk-upload-actions"><Button variant="secondary" onClick={downloadTemplate}>Download Template</Button><label className="file-upload-button">{bulkSaving ? "Importing..." : "Choose Excel / CSV"}<input type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkFile} disabled={bulkSaving} /></label></div>
          {bulkResult && <div className="bulk-result"><strong>{bulkResult.message}</strong><p>Created: {bulkResult.summary?.created || 0} · Failed: {bulkResult.summary?.failed || 0}</p>{bulkResult.failed?.length > 0 && <div className="bulk-errors">{bulkResult.failed.map((item) => <div key={`${item.row}-${item.email}`}>Row {item.row}: {item.message}</div>)}</div>}{bulkResult.created?.length > 0 && <Button size="sm" onClick={() => copyText(bulkResult.created.map((item) => `${item.externalId} | ${item.name} | ${item.email} | ${item.password}`).join("\n"))}>Copy Created Credentials</Button>}</div>}
        </div>
      </Modal>
    </div>
  );
};

export default Participants;
