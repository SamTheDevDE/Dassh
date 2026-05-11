import { check } from "@tauri-apps/plugin-updater";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastProvider, useToast } from "./components/Toast";
import { THEMES, applyTheme } from "./lib/themes";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { SftpBrowser } from "./pages/SftpBrowser";
import { TerminalPage } from "./pages/Terminal";
import { Unlock } from "./pages/Unlock";
import { useSettingsStore } from "./store/settings";
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

function StartupUpdateCheck() {
  const toast = useToast();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    let cancelled = false;
    (async () => {
      try {
        const update = await check();
        if (!cancelled && update) {
          toast.info(`Update v${update.version} is available. Open Settings > About to install.`);
        }
      } catch {
        // Keep startup quiet if updater is not available in this environment.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export default function App() {
  const themeId = useSettingsStore((s) => s.themeId);

  useLayoutEffect(() => {
    const theme = THEMES.length > 0 ? THEMES.find((t) => t.id === themeId) ?? THEMES[0] : undefined;
    if (theme) {
      applyTheme(theme);
    }
  }, [themeId]);

  return (
    <ToastProvider>
      <StartupUpdateCheck />
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
