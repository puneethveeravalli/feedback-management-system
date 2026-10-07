import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Organizations from "./pages/Organizations";
import Departments from "./pages/Departments";
import Groups from "./pages/Groups";
import Participants from "./pages/Participants";
import FeedbackForms from "./pages/FeedbackForms";
import Questions from "./pages/Questions";
import Assignments from "./pages/Assignments";
import AccessCredentials from "./pages/AccessCredentials";
import ParticipantAccess from "./pages/ParticipantAccess";
import TakeFeedback from "./pages/TakeFeedback";
import Analytics from "./pages/Analytics";
import Actions from "./pages/Actions";
import Reports from "./pages/Reports";
import Managers from "./pages/Managers";

const AdminPage = ({ children, roles }) => (
  <ProtectedRoute roles={roles}>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const ParticipantEntry = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading">Checking authentication...</div>;
  if (user?.role === "PARTICIPANT") return <Navigate to="/participant-access?mode=assigned" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  const adminRoles = ["SUPER_ADMIN", "ORG_ADMIN"];
  const reportingRoles = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"];
  const managementRoles = ["SUPER_ADMIN", "ORG_ADMIN"];

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/participant-access" element={<ParticipantAccess />} />
          <Route path="/take-feedback" element={<TakeFeedback />} />

          <Route path="/participant-dashboard" element={<ParticipantEntry />} />

          <Route path="/dashboard" element={<AdminPage roles={["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"]}><Dashboard /></AdminPage>} />
          <Route path="/organizations" element={<AdminPage roles={["SUPER_ADMIN"]}><Organizations /></AdminPage>} />
          <Route path="/departments" element={<AdminPage roles={adminRoles}><Departments /></AdminPage>} />
          <Route path="/groups" element={<AdminPage roles={adminRoles}><Groups /></AdminPage>} />
          <Route path="/participants" element={<AdminPage roles={managementRoles}><Participants /></AdminPage>} />
          <Route path="/feedback-forms" element={<AdminPage roles={managementRoles}><FeedbackForms /></AdminPage>} />
          <Route path="/questions" element={<AdminPage roles={managementRoles}><Questions /></AdminPage>} />
          <Route path="/assignments" element={<AdminPage roles={managementRoles}><Assignments /></AdminPage>} />
          <Route path="/access-credentials" element={<AdminPage roles={managementRoles}><AccessCredentials /></AdminPage>} />
          <Route path="/analytics" element={<AdminPage roles={reportingRoles}><Analytics /></AdminPage>} />
          <Route path="/reports" element={<AdminPage roles={reportingRoles}><Reports /></AdminPage>} />
          <Route path="/actions" element={<AdminPage roles={reportingRoles}><Actions /></AdminPage>} />
          <Route path="/managers" element={<AdminPage roles={managementRoles}><Managers /></AdminPage>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
