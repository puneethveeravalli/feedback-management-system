import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import DetailsViewer from "../ui/DetailsViewer";

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-label="Close navigation"
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="app-main">
        <Topbar onMenuClick={() => setSidebarOpen((value) => !value)} />
        <main className="page-content">{children}</main>
      </div>
      <DetailsViewer />
    </div>
  );
};

export default AppLayout;
