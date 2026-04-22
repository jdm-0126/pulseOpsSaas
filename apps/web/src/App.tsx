import { useMemo, useState } from "react";
import { Provider } from "react-redux";
import { useAuth } from "./hooks/useAuth";
import { createStore } from "./store";
import { AuthPage } from "./pages/AuthPage";
import { OverviewPage } from "./pages/OverviewPage";
import { EventsPage } from "./pages/EventsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { MembersPage } from "./pages/MembersPage";
import { BillingPage } from "./pages/BillingPage";
import { Sidebar, Page } from "./components/Sidebar";
import { AiAssistant } from "./components/AiAssistant";

function Dashboard({ apiFetch }: { apiFetch: ReturnType<typeof useAuth>["apiFetch"] }) {
  const store = useMemo(() => createStore(apiFetch), [apiFetch]);
  const [page, setPage] = useState<Page>("overview");

  const content: Record<Page, JSX.Element> = {
    overview:  <OverviewPage />,
    events:    <EventsPage />,
    analytics: <AnalyticsPage />,
    members:   <MembersPage />,
    billing:   <BillingPage />,
  };

  return (
    <Provider store={store}>
      <div className="layout">
        <Sidebar page={page} setPage={setPage} />
        <main className="main">{content[page]}</main>
        <AiAssistant />
      </div>
    </Provider>
  );
}

export default function App() {
  const { auth, apiFetch } = useAuth();
  const [authed, setAuthed] = useState(!!auth);
  return authed ? <Dashboard apiFetch={apiFetch} /> : <AuthPage onLogin={() => setAuthed(true)} />;
}
