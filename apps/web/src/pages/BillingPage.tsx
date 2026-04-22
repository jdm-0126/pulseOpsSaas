import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUsage, openBillingPortal } from "../store/billingSlice";

export function BillingPage() {
  const dispatch = useAppDispatch();
  const { usage, portalLoading } = useAppSelector(s => s.billing);

  useEffect(() => { dispatch(fetchUsage()); }, [dispatch]);

  return (
    <div>
      <div className="page-header">
        <h1>Billing</h1>
        <p>Subscription and usage details</p>
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="section-header"><h2>Current Plan</h2></div>
          <div style={{ padding: "16px 0" }}>
            <span className="badge badge-success" style={{ fontSize: 14, padding: "6px 14px" }}>
              Free Tier
            </span>
            <p style={{ color: "var(--muted)", marginTop: 12 }}>
              Upgrade to unlock higher limits and premium features.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => dispatch(openBillingPortal())} >
            {portalLoading ? "Redirecting…" : "Manage Billing"}
          </button>
        </div>

        <div className="card">
          <div className="section-header"><h2>Usage This Month</h2></div>
          {usage.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              <div className="icon">📊</div>No usage recorded yet
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
