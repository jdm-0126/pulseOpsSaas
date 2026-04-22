import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchEvents } from "../store/eventsSlice";
import { fetchAnalytics } from "../store/analyticsSlice";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { DoughnutChart } from "../components/DoughnutChart";

export function OverviewPage() {
  const dispatch = useAppDispatch();
  const { items: events }                        = useAppSelector(s => s.events);
  const { summary, eventData }                   = useAppSelector(s => s.analytics);

  useEffect(() => {
    dispatch(fetchAnalytics());
    dispatch(fetchEvents());
    const t = setInterval(() => {
      dispatch(fetchAnalytics());
      dispatch(fetchEvents());
    }, 5000);
    return () => clearInterval(t);
  }, [dispatch]);

  const typeTotals = eventData.reduce<Record<string, number>>((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] ?? 0) + Number(e.count);
    return acc;
  }, {});
  const chartLabels = Object.keys(typeTotals);
  const chartValues = Object.values(typeTotals);

  const totalEvents  = Number(summary?.total_events ?? 0);
  const totalRevenue = Number(summary?.total_revenue_cents ?? 0) / 100;
  const activeDays   = Number(summary?.active_days ?? 0);

  return (
    <div>
      <div className="page-header">
        <h1>Overview</h1>
        <p>Real-time platform activity <span className="pulse-dot" style={{ marginLeft: 8 }} /></p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 12px" }}>
          <div className="stat-label" style={{ marginBottom: 8 }}>Events by Type</div>
          {chartLabels.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}><div className="icon">📊</div>No data</div>
          ) : (
            <div style={{ position: "relative", width: 160, height: 160 }}>
              <DoughnutChart labels={chartLabels} values={chartValues} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                  <AnimatedCounter value={totalEvents} />
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>total</span>
              </div>
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue</div>
          <div className="stat-value"><AnimatedCounter value={totalRevenue} prefix="$" decimals={2} /></div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Days</div>
          <div className="stat-value"><AnimatedCounter value={activeDays} /></div>
          <div className="stat-sub">With activity</div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Recent Events</h2>
          <span className="badge badge-info">Live</span>
        </div>
        <div className="table-wrap">
          {events.length === 0 ? (
            <div className="empty"><div className="icon">📭</div>No events yet</div>
          ) : (
            <table>
              <thead><tr><th>ID</th><th>Type</th><th>Key</th><th>Time</th></tr></thead>
              <tbody>
                {events.slice(0, 8).map(e => (
                  <tr key={e.id}>
                    <td style={{ color: "var(--muted)" }}>#{e.id}</td>
                    <td><span className="badge badge-info">{e.type}</span></td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{e.idempotency_key}</td>
                    <td style={{ color: "var(--muted)" }}>{new Date(e.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
