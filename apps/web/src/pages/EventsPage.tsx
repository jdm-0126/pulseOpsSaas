import { useEffect, useState } from "react";
import React from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchEvents } from "../store/eventsSlice";

export function EventsPage() {
  const dispatch = useAppDispatch();
  const { items: events } = useAppSelector(s => s.events);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchEvents());
    const t = setInterval(() => dispatch(fetchEvents()), 5000);
    return () => clearInterval(t);
  }, [dispatch]);

  return (
    <div>
      <div className="page-header">
        <h1>Events</h1>
        <p>All ingested events for this account</p>
      </div>
      <div className="card">
        <div className="table-wrap">
          {events.length === 0 ? (
            <div className="empty"><div className="icon">📭</div>No events yet</div>
          ) : (
            <table>
              <thead>
                <tr><th>ID</th><th>Type</th><th>Key</th><th>Time</th><th>Payload</th></tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <React.Fragment key={e.id}>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>#{e.id}</td>
                      <td><span className="badge badge-info">{e.type}</span></td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{e.idempotency_key}</td>
                      <td style={{ color: "var(--muted)" }}>{new Date(e.created_at).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: 12 }}
                          onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                          {expanded === e.id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expanded === e.id && (
                      <tr>
                        <td colSpan={5} style={{ background: "var(--bg)", padding: 16 }}>
                          <pre style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(e.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
