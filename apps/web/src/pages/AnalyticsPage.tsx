import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchAnalytics } from "../store/analyticsSlice";
import { fetchUsage } from "../store/billingSlice";
import { AnimatedCounter } from "../components/AnimatedCounter";

export function AnalyticsPage() {
  const dispatch = useAppDispatch();
  const { revenue, eventData }  = useAppSelector(s => s.analytics);
  const { usage }               = useAppSelector(s => s.billing);

  useEffect(() => {
    dispatch(fetchAnalytics());
    dispatch(fetchUsage());
    const t = setInterval(() => dispatch(fetchAnalytics()), 10000);
    return () => clearInterval(t);
  }, [dispatch]);

  const totalRevenueDollars = revenue.reduce((s, r) => s + Number(r.revenue_cents), 0) / 100;
  const totalEvents         = eventData.reduce((s, e) => s + Number(e.count), 0);
  const activeDays          = new Set(revenue.map(r => r.date)).size;

  return (
    <div>
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Current month performance</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Revenue (MTD)</div>
          <div className="stat-value"><AnimatedCounter value={totalRevenueDollars} prefix="$" decimals={2} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Events (MTD)</div>
          <div className="stat-value"><AnimatedCounter value={totalEvents} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Days</div>
          <div className="stat-value"><AnimatedCounter value={activeDays} /></div>
        </div>
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="section-header"><h2>Revenue by Day</h2></div>
          <div className="table-wrap">
            {revenue.length === 0 ? (
              <div className="empty"><div className="icon">📈</div>No revenue data</div>
            ) : (
              <table>
                <thead><tr><th>Date</th><th>Revenue</th></tr></thead>
                <tbody>
                  {revenue.map(r => (
                    <tr key={r.date}>
                      <td>{r.date}</td>
                      <td>${(Number(r.revenue_cents) / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-header"><h2>Events by Type</h2></div>
          <div className="table-wrap">
            {eventData.length === 0 ? (
              <div className="empty"><div className="icon">📊</div>No event data</div>
            ) : (
              <table>
                <thead><tr><th>Date</th><th>Type</th><th>Count</th></tr></thead>
                <tbody>
                  {eventData.map((e, i) => (
                    <tr key={i}>
                      <td>{e.date}</td>
                      <td><span className="badge badge-info">{e.event_type}</span></td>
                      <td>{e.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {usage.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-header"><h2>Usage This Month</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Metric</th><th>Total</th></tr></thead>
              <tbody>
                {usage.map(u => (
                  <tr key={u.metric}>
                    <td style={{ fontFamily: "monospace" }}>{u.metric}</td>
                    <td>{u.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
