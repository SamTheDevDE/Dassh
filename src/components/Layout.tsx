import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-1)",
          minWidth: 0,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
