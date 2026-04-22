import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchMembers, sendInvite, revokeInvite, removeMember, clearError } from "../store/membersSlice";

export function MembersPage() {
  const dispatch = useAppDispatch();
  const { members, invites, error } = useAppSelector(s => s.members);
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState("member");
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => { dispatch(fetchMembers()); }, [dispatch]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(sendInvite({ email, role }));
    if (sendInvite.fulfilled.match(result)) setEmail("");
  };

  const copyToken = (id: number, token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/accept-invite?token=${token}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const roleBadge = (r: string) =>
    r === "owner" ? "badge-warning" : r === "admin" ? "badge-info" : "badge-muted";

  return (
    <div>
      <div className="page-header">
        <h1>Members</h1>
        <p>Manage team access and invitations</p>
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-header"><h2>Team Members</h2></div>
            <div className="table-wrap">
              {members.length === 0 ? (
                <div className="empty"><div className="icon">👥</div>No members</div>
              ) : (
                <table>
                  <thead><tr><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id}>
                        <td>{m.email}</td>
                        <td><span className={`badge ${roleBadge(m.role)}`}>{m.role}</span></td>
                        <td style={{ color: "var(--muted)" }}>{new Date(m.joined_at).toLocaleDateString()}</td>
                        <td>
                          {m.role !== "owner" && (
                            <button className="btn btn-danger" style={{ padding: "3px 10px", fontSize: 12 }}
                              onClick={() => dispatch(removeMember(m.id))}>Remove</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {invites.length > 0 && (
            <div className="card">
              <div className="section-header"><h2>Pending Invites</h2></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Email</th><th>Role</th><th>Sent</th><th></th></tr></thead>
                  <tbody>
                    {invites.map(inv => (
                      <tr key={inv.id}>
                        <td>{inv.email}</td>
                        <td><span className={`badge ${roleBadge(inv.role)}`}>{inv.role}</span></td>
                        <td style={{ color: "var(--muted)" }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: 12 }}
                            onClick={() => copyToken(inv.id, inv.token)}>
                            {copied === inv.id ? "Copied!" : "Copy Link"}
                          </button>
                          <button className="btn btn-danger" style={{ padding: "3px 10px", fontSize: 12 }}
                            onClick={() => dispatch(revokeInvite(inv.id))}>Revoke</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 16, fontSize: 16 }}>Invite Member</h2>
          <form onSubmit={invite}>
            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" placeholder="colleague@example.com"
                value={email} onChange={e => { setEmail(e.target.value); dispatch(clearError()); }} required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn btn-primary" style={{ width: "100%" }} type="submit">
              Send Invite
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
