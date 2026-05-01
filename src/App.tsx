import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { SftpBrowser } from "./pages/SftpBrowser";
import { TerminalPage } from "./pages/Terminal";
import { Unlock } from "./pages/Unlock";
import { useVaultStore } from "./store/vault";

function Guard({ children }: { children: React.ReactNode }) {
  const { isLocked, checkVault } = useVaultStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkVault().then(() => {
      if (isLocked) navigate("/unlock", { replace: true });
    });
  }, [isLocked]);

  if (isLocked) return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/unlock" element={<Unlock />} />
          <Route
            element={
              <Guard>
                <Layout />
              </Guard>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="terminal/:sessionId" element={<TerminalPage />} />
            <Route path="sftp/:sessionId" element={<SftpBrowser />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
