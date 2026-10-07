import { useEffect, useState } from "react";
import api from "../services/api";
import Loading from "../components/ui/Loading";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import { ViewDetailsButton } from "../components/ui/DetailsViewer";

const Analytics = () => {
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [summary, setSummary] = useState(null);
  const [formAnalytics, setFormAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [formsResponse, summaryResponse] = await Promise.all([
        api.get("/feedback-forms"),
        api.get("/analytics/summary"),
      ]);
      setForms(formsResponse.data?.forms || []);
      setSummary(summaryResponse.data || {});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const loadForm = async (formId) => {
    setSelectedFormId(formId);
    setFormAnalytics(null);
    if (!formId) return;
    try {
      setFormLoading(true);
      const response = await api.get(`/analytics/form/${formId}`);
      setFormAnalytics(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load form analytics.");
    } finally { setFormLoading(false); }
  };

  if (loading) return <div className="page"><Loading /></div>;

  const data = summary?.summary || {};

  return (
    <div className="page">
      <div className="page-head"><div><h1>Analytics</h1><p>Visual feedback insights, participation and performance.</p></div></div>
      {error && <div className="error-box">{error}</div>}

      <div className="analytics-kpi-grid">
        <Kpi label="Total Forms" value={data.totalForms ?? 0} />
        <Kpi label="Active Forms" value={data.activeForms ?? 0} />
        <Kpi label="Responses" value={data.totalResponses ?? 0} />
        <Kpi label="Response Rate" value={`${data.participationRate ?? 0}%`} />
        <Kpi label="Average Rating" value={data.averageRating ?? 0} />
        <Kpi label="Open Actions" value={summary?.actionSummary?.open ?? 0} />
      </div>

      <section className="analytics-chart-grid">
        <ChartCard title="Response Trend"><LineChart data={summary?.responseTrends || []} /></ChartCard>
        <ChartCard title="Rating Overview"><RatingChart questions={formAnalytics?.questions || summary?.lowRatingIndicators || []} /></ChartCard>
      </section>

      <section className="analytics-chart-grid">
        <ChartCard title="Group Participation"><BarChart data={(summary?.groupComparison || []).map((item) => ({ label: item.groupName, value: item.responses, secondary: item.responseRate }))} /></ChartCard>
        <ChartCard title="Response Type"><DonutChart values={[{ label: "Anonymous", value: data.anonymousResponses || 0 }, { label: "Identified", value: data.identifiedResponses || 0 }]} /></ChartCard>
      </section>

      <section className="analytics-section">
        <div className="analytics-section-header"><div><h2>Form Performance</h2><p>Participation across feedback forms.</p></div></div>
        {(summary?.formPerformance || []).length === 0 ? <EmptyState title="No form data" description="Create and activate a feedback form to see analytics." /> : <div className="table-wrap"><table><thead><tr><th>Form</th><th>Status</th><th>Responses</th><th>Eligible</th><th>Rate</th><th>Details</th></tr></thead><tbody>{summary.formPerformance.map((item) => <tr key={item.formId}><td>{item.title}</td><td><Badge status={item.status} /></td><td>{item.responses}</td><td>{item.eligibleParticipants}</td><td>{item.responseRate}%</td><td><ViewDetailsButton item={item} /></td></tr>)}</tbody></table></div>}
      </section>

      <section className="analytics-two-column">
        <div className="analytics-section"><div className="analytics-section-header"><div><h2>Low Rating Indicators</h2><p>Questions needing attention.</p></div></div>{(summary?.lowRatingIndicators || []).length === 0 ? <div className="analytics-no-data">No low-rating indicators.</div> : summary.lowRatingIndicators.map((item) => <div className="analytics-alert-row" key={item.questionId}><div><strong>{item.questionText}</strong><span>Average {item.average ?? "—"}</span></div><b>{item.lowRatingCount}</b></div>)}</div>
        <div className="analytics-section"><div className="analytics-section-header"><div><h2>Recent Comments</h2><p>Latest text feedback.</p></div></div>{(summary?.recentComments || []).length === 0 ? <div className="analytics-no-data">No comments yet.</div> : summary.recentComments.map((item, index) => <div className="comment-item" key={`${item.questionId}-${index}`}><strong>{item.questionText}</strong><p>{item.comment}</p></div>)}</div>
      </section>

      <section className="analytics-section analytics-selector-section">
        <div className="analytics-section-header"><div><h2>Detailed Form Analytics</h2><p>Select a form to view every question result.</p></div></div>
        <div className="form-field"><label htmlFor="analytics-form">Feedback Form</label><select id="analytics-form" value={selectedFormId} onChange={(event) => loadForm(event.target.value)}><option value="">Select a feedback form</option>{forms.map((form) => <option key={form._id} value={form._id}>{form.title}</option>)}</select></div>
      </section>

      {formLoading && <div className="table-card"><Loading /></div>}
      {!formLoading && selectedFormId && formAnalytics && <FormDetails analytics={formAnalytics} />}
    </div>
  );
};

const Kpi = ({ label, value }) => <div className="card analytics-kpi"><span>{label}</span><strong>{value}</strong></div>;
const ChartCard = ({ title, children }) => <div className="card analytics-chart-card"><h3>{title}</h3>{children}</div>;

const LineChart = ({ data }) => {
  if (!data.length) return <div className="analytics-no-data">No response trend data yet.</div>;
  const width = 620, height = 240, pad = 34;
  const max = Math.max(...data.map((item) => Number(item.responses) || 0), 1);
  const points = data.map((item, index) => {
    const x = pad + (index / Math.max(data.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - ((Number(item.responses) || 0) / max) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return <div className="svg-chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Response trend chart"><line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="chart-axis" /><polyline points={points} fill="none" className="chart-line" />{data.map((item, index) => { const [x,y]=points.split(" ")[index].split(","); return <circle key={item.date} cx={x} cy={y} r="4" className="chart-point" />; })}</svg><div className="chart-label-row">{data.slice(-7).map((item) => <span key={item.date}>{item.date.slice(5)}</span>)}</div></div>;
};

const BarChart = ({ data }) => {
  if (!data.length) return <div className="analytics-no-data">No group data yet.</div>;
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  return <div className="simple-bar-chart">{data.slice(0, 8).map((item) => <div className="simple-bar-row" key={item.label}><div className="simple-bar-label"><span>{item.label}</span><strong>{item.value}</strong></div><div className="simple-bar-track"><div className="simple-bar-fill" style={{ width: `${Math.max(3, ((Number(item.value) || 0) / max) * 100)}%` }} /></div><small>{item.secondary ?? 0}% participation</small></div>)}</div>;
};

const DonutChart = ({ values }) => {
  const total = values.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return <div className="analytics-no-data">No response type data yet.</div>;
  let offset = 0;
  const radius = 54, circumference = 2 * Math.PI * radius;
  return <div className="donut-chart-wrap"><svg viewBox="0 0 140 140" className="donut-chart"><circle cx="70" cy="70" r={radius} className="donut-track" />{values.map((item) => { const length = (Number(item.value) / total) * circumference; const dash = `${length} ${circumference - length}`; const circle = <circle key={item.label} cx="70" cy="70" r={radius} className="donut-segment" strokeDasharray={dash} strokeDashoffset={-offset} />; offset += length; return circle; })}<text x="70" y="68" textAnchor="middle" className="donut-total">{total}</text><text x="70" y="84" textAnchor="middle" className="donut-caption">Responses</text></svg><div className="donut-legend">{values.map((item) => <div key={item.label}><span className="legend-dot" /><strong>{item.label}</strong><span>{item.value} ({Math.round((item.value / total) * 100)}%)</span></div>)}</div></div>;
};

const RatingChart = ({ questions }) => {
  const values = questions.filter((item) => item.average !== null && item.average !== undefined).slice(0, 8);
  if (!values.length) return <div className="analytics-no-data">Select a form for detailed rating visualization.</div>;
  const max = 5;
  return <div className="simple-bar-chart">{values.map((item) => <div className="simple-bar-row" key={item.questionId}><div className="simple-bar-label"><span>{item.questionText}</span><strong>{Number(item.average).toFixed(2)}</strong></div><div className="simple-bar-track"><div className="simple-bar-fill" style={{ width: `${Math.max(3, (Number(item.average) / max) * 100)}%` }} /></div></div>)}</div>;
};

const FormDetails = ({ analytics }) => <section className="analytics-section"><div className="analytics-section-header"><div><h2>{analytics.form?.title}</h2><p>{analytics.summary?.totalResponses || 0} responses · Average rating {analytics.summary?.averageRating || 0}</p></div></div>{(analytics.questions || []).map((question, index) => <div className="analytics-question-card" key={question.questionId}><div className="analytics-question-header"><div><span className="question-number">Question {index + 1}</span><h3>{question.questionText}</h3></div><Badge>{question.type}</Badge></div><div className="question-answer-info"><div><span>Answers</span><strong>{question.totalAnswers}</strong></div>{question.average !== null && <div><span>Average</span><strong>{Number(question.average).toFixed(2)}</strong></div>}<div><span>Low Ratings</span><strong>{question.lowRatingCount || 0}</strong></div></div>{Object.keys(question.distribution || {}).length > 0 && <BarChart data={Object.entries(question.distribution).map(([label,value]) => ({label,value}))} />}</div>)}</section>;

export default Analytics;
