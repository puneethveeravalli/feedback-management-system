import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../services/api";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const REPORTS = {
  FORM: "Form Report",
  GROUP: "Group Report",
  QUESTION: "Question Report",
  PERIOD: "Period Comparison",
  PARTICIPATION: "Participation Report",
  COMMENTS: "Comments Report",
};

const Reports = () => {
  const [type, setType] = useState("FORM");
  const [forms, setForms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/feedback-forms"), api.get("/groups")])
      .then(([formsResponse, groupsResponse]) => {
        setForms(formsResponse.data?.forms || []);
        setGroups(groupsResponse.data?.groups || []);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load report filters."))
      .finally(() => setLoading(false));
  }, []);

  const handleType = async (value) => {
    setType(value); setSelectedId(""); setSelectedFormId(""); setQuestions([]); setReport(null); setError("");
  };

  const loadQuestions = async (formId) => {
    setSelectedFormId(formId); setSelectedId(""); setReport(null);
    if (!formId) return setQuestions([]);
    try { const response = await api.get(`/questions/form/${formId}`); setQuestions(response.data?.questions || []); }
    catch (err) { setError(err.response?.data?.message || "Failed to load questions."); }
  };

  const generate = async () => {
    try {
      setError(""); setReport(null);
      if (["FORM", "GROUP", "QUESTION"].includes(type) && !selectedId) return setError("Please select an item first.");
      if (type === "PERIOD" && (!startDate || !endDate)) return setError("Please select both start and end dates.");
      if (type === "PERIOD" && startDate > endDate) return setError("Start date cannot be after end date.");
      setGenerating(true);
      let response;
      if (type === "FORM") response = await api.get(`/reports/form/${selectedId}`);
      if (type === "GROUP") response = await api.get(`/reports/group/${selectedId}`);
      if (type === "QUESTION") response = await api.get(`/reports/question/${selectedId}`);
      if (type === "PERIOD") response = await api.get("/reports/period", { params: { startDate, endDate } });
      if (type === "PARTICIPATION") response = await api.get("/reports/participation");
      if (type === "COMMENTS") response = await api.get("/reports/comments");
      setReport(response?.data || null);
    } catch (err) { setError(err.response?.data?.message || "Failed to generate report."); }
    finally { setGenerating(false); }
  };

  const rowsForExport = () => {
    if (!report) return [];
    if (type === "FORM") return (report.questions || []).map((q) => ({ Question: q.questionText, Type: q.type, Answers: q.totalAnswers, Average: q.average ?? "", Minimum: q.minimum ?? "", Maximum: q.maximum ?? "" }));
    if (type === "GROUP") return (report.assignments || []).map((a) => ({ Form: a.formTitle, Status: a.status, Responses: a.responses }));
    if (type === "QUESTION") return [{ Question: report.question?.questionText, Type: report.question?.type, Answers: report.summary?.totalAnswers, Average: report.summary?.average ?? "", Minimum: report.summary?.minimum ?? "", Maximum: report.summary?.maximum ?? "" }];
    if (type === "PERIOD") return (report.daily || []).map((item) => ({ Date: item.date, Responses: item.responses }));
    if (type === "PARTICIPATION") return (report.groups || []).map((item) => ({ Group: item.groupName, Participants: item.participants, Responses: item.responses, "Participation Rate": `${item.participationRate}%` }));
    return (report.comments || []).map((item) => ({ Question: item.questionText, Comment: item.comment, Date: item.createdAt }));
  };

  const exportCsv = () => {
    const rows = rowsForExport();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `${type.toLowerCase()}-report.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const rows = rowsForExport(); if (!rows.length) return;
    const sheet = XLSX.utils.json_to_sheet(rows); const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Report"); XLSX.writeFile(workbook, `${type.toLowerCase()}-report.xlsx`);
  };

  const exportPdf = () => {
    const rows = rowsForExport(); if (!rows.length) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text(REPORTS[type], 14, 15);
    autoTable(doc, { startY: 22, head: [Object.keys(rows[0])], body: rows.map((row) => Object.values(row).map((value) => String(value ?? ""))) });
    doc.save(`${type.toLowerCase()}-report.pdf`);
  };

  if (loading) return <div className="page"><Loading /></div>;

  return (
    <div className="page reports-page">
      <div className="page-head"><div><h1>Reports</h1><p>Generate filtered feedback reports and export them.</p></div></div>
      {error && <div className="error-box">{error}</div>}

      <div className="card report-filter-card">
        <div className="form-grid">
          <Select label="Report Type" value={type} onChange={(e) => handleType(e.target.value)}>{Object.entries(REPORTS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</Select>
          {type === "FORM" && <Select label="Feedback Form" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="">Select form</option>{forms.map((form) => <option key={form._id} value={form._id}>{form.title}</option>)}</Select>}
          {type === "GROUP" && <Select label="Group" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="">Select group</option>{groups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}</Select>}
          {type === "QUESTION" && <><Select label="Feedback Form" value={selectedFormId} onChange={(e) => loadQuestions(e.target.value)}><option value="">Select form</option>{forms.map((form) => <option key={form._id} value={form._id}>{form.title}</option>)}</Select><Select label="Question" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={!selectedFormId}><option value="">Select question</option>{questions.map((q) => <option key={q._id} value={q._id}>{q.questionText}</option>)}</Select></>}
          {type === "PERIOD" && <><div className="form-field"><label>Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div><div className="form-field"><label>End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div></>}
        </div>
        <Button onClick={generate} disabled={generating}>{generating ? "Generating..." : "Generate Report"}</Button>
      </div>

      {!report ? <EmptyState title="No report generated" description="Choose a report and generate it to view results." /> : <>
        <div className="report-export-bar"><strong>{REPORTS[type]}</strong><div><Button size="sm" variant="secondary" onClick={exportCsv}>CSV</Button><Button size="sm" variant="secondary" onClick={exportExcel}>Excel</Button><Button size="sm" variant="secondary" onClick={exportPdf}>PDF</Button></div></div>
        <ReportView type={type} report={report} />
      </>}
    </div>
  );
};

const ReportView = ({ type, report }) => {
  if (type === "FORM") return <section className="card report-result"><h2>{report.form?.title}</h2><div className="analytics-kpi-grid"><div><span>Responses</span><strong>{report.summary?.totalResponses || 0}</strong></div><div><span>Average Rating</span><strong>{report.summary?.averageRating || 0}</strong></div><div><span>Anonymous</span><strong>{report.summary?.anonymousResponses || 0}</strong></div></div><div className="table-wrap"><table><thead><tr><th>Question</th><th>Type</th><th>Answers</th><th>Average</th><th>Min</th><th>Max</th></tr></thead><tbody>{(report.questions || []).map((q) => <tr key={q.questionId}><td>{q.questionText}</td><td>{q.type}</td><td>{q.totalAnswers}</td><td>{q.average ?? "—"}</td><td>{q.minimum ?? "—"}</td><td>{q.maximum ?? "—"}</td><td><ViewDetailsButton item={q} /></td></tr>)}</tbody></table></div></section>;
  if (type === "GROUP") return <section className="card report-result"><h2>{report.group?.name}</h2><p>Participants: {report.summary?.activeParticipants || 0} · Responses: {report.summary?.responses || 0}</p><div className="table-wrap"><table><thead><tr><th>Form</th><th>Status</th><th>Responses</th><th>Details</th></tr></thead><tbody>{(report.assignments || []).map((item) => <tr key={item.assignmentId}><td>{item.formTitle}</td><td>{item.status}</td><td>{item.responses}</td><td><ViewDetailsButton item={item} /></td></tr>)}</tbody></table></div></section>;
  if (type === "QUESTION") return <section className="card report-result"><h2>{report.question?.questionText}</h2><p>{report.question?.type} · Answers: {report.summary?.totalAnswers || 0} · Average: {report.summary?.average ?? "—"}</p><BarDistribution distribution={report.summary?.distribution || {}} /></section>;
  if (type === "PERIOD") return <section className="card report-result"><h2>{report.period?.startDate} to {report.period?.endDate}</h2><p>Total responses: {report.summary?.totalResponses || 0}</p><BarDistribution distribution={Object.fromEntries((report.daily || []).map((item) => [item.date, item.responses]))} /></section>;
  if (type === "PARTICIPATION") return <section className="card report-result"><h2>Participation</h2><div className="table-wrap"><table><thead><tr><th>Group</th><th>Participants</th><th>Responses</th><th>Rate</th><th>Details</th></tr></thead><tbody>{(report.groups || []).map((item) => <tr key={item.groupId}><td>{item.groupName}</td><td>{item.participants}</td><td>{item.responses}</td><td>{item.participationRate}%</td><td><ViewDetailsButton item={item} /></td></tr>)}</tbody></table></div></section>;
  return <section className="card report-result"><h2>Comments</h2>{(report.comments || []).length === 0 ? <EmptyState title="No comments" description="No text feedback is available." /> : report.comments.map((item, index) => <div className="comment-item" key={index}><strong>{item.questionText}</strong><p>{item.comment}</p></div>)}</section>;
};

const BarDistribution = ({ distribution }) => {
  const entries = Object.entries(distribution || {});
  if (!entries.length) return <div className="analytics-no-data">No distribution data.</div>;
  const max = Math.max(...entries.map(([, value]) => Number(value) || 0), 1);
  return <div className="simple-bar-chart">{entries.map(([label,value]) => <div className="simple-bar-row" key={label}><div className="simple-bar-label"><span>{label}</span><strong>{value}</strong></div><div className="simple-bar-track"><div className="simple-bar-fill" style={{ width: `${Math.max(3, (Number(value) / max) * 100)}%` }} /></div></div>)}</div>;
};

export default Reports;
