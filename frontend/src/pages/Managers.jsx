import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const INITIAL = { name: "", email: "", password: "" };

const Managers = () => {
  const { user } = useAuth();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL);

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.get("/organizations/users");
      setManagers((response.data?.users || []).filter((item) => item.role === "MANAGER"));
    } catch (err) { setError(err.response?.data?.message || "Failed to load managers."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.role]);

  const create = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      setError("Name, valid email and a password of at least 6 characters are required.");
      return;
    }
    try {
      setSaving(true); setError("");
      const organizationResponse = await api.get("/organizations/my-organization");
      const organizationId = organizationResponse.data?.organization?._id;
      if (!organizationId) throw new Error("Select an organization before creating a manager.");
      await api.post(`/organizations/${organizationId}/manager`, { name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password });
      setForm(INITIAL); setModalOpen(false); await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to create manager."); }
    finally { setSaving(false); }
  };

  const toggle = async (manager) => {
    try {
      await api.patch(`/organizations/manager/${manager._id}/status`, { status: manager.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      await load();
    } catch (err) { setError(err.response?.data?.message || "Failed to update manager status."); }
  };

  return (
    <div className="page">
      <div className="page-head"><div><h1>Managers</h1><p>Manage managers who can access permitted reports and assigned actions.</p></div><Button onClick={() => { setError(""); setForm(INITIAL); setModalOpen(true); }}>+ Create Manager</Button></div>
      {error && <div className="error-box">{error}</div>}
      {loading ? <Loading /> : managers.length === 0 ? <EmptyState title="No managers found" description="Create a manager for the selected organization." action={<Button onClick={() => setModalOpen(true)}>Create Manager</Button>} /> : <div className="table-card"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>{managers.map((manager) => <tr key={manager._id}><td><strong>{manager.name}</strong></td><td>{manager.email}</td><td><Badge status={manager.status} /></td><td><div className="table-actions"><ViewDetailsButton item={manager} /><Button size="sm" variant={manager.status === "ACTIVE" ? "danger" : "primary"} onClick={() => toggle(manager)}>{manager.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button></div></td></tr>)}</tbody></table></div></div>}

      <Modal open={modalOpen} title="Create Manager" onClose={() => !saving && setModalOpen(false)} footer={<><Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" form="manager-form" disabled={saving}>{saving ? "Creating..." : "Create Manager"}</Button></>}>
        <form id="manager-form" onSubmit={create}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        </form>
      </Modal>
    </div>
  );
};

export default Managers;
