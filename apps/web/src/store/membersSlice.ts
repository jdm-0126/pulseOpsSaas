import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { ApiFetch } from "./index";

export type Member = { id: number; email: string; role: string; joined_at: string };
export type Invite = { id: number; email: string; role: string; created_at: string; token: string };

type State = { members: Member[]; invites: Invite[]; status: "idle" | "loading" | "error"; error: string };

const initialState: State = { members: [], invites: [], status: "idle", error: "" };

export const fetchMembers = createAsyncThunk<
  { members: Member[]; invites: Invite[] },
  void,
  { extra: { apiFetch: ApiFetch } }
>("members/fetch", async (_, { extra: { apiFetch } }) => {
  const [m, i] = await Promise.all([
    apiFetch("/api/account/members").then(r => r.json()),
    apiFetch("/api/account/invites").then(r => r.json()),
  ]);
  return {
    members: Array.isArray(m) ? m : [],
    invites: Array.isArray(i) ? i : [],
  };
});

export const sendInvite = createAsyncThunk<
  void,
  { email: string; role: string },
  { extra: { apiFetch: ApiFetch } }
>("members/invite", async (body, { extra: { apiFetch }, dispatch }) => {
  const res = await apiFetch("/api/account/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  dispatch(fetchMembers());
});

export const revokeInvite = createAsyncThunk<void, number, { extra: { apiFetch: ApiFetch } }>(
  "members/revokeInvite",
  async (id, { extra: { apiFetch }, dispatch }) => {
    await apiFetch(`/api/account/invites/${id}`, { method: "DELETE" });
    dispatch(fetchMembers());
  }
);

export const removeMember = createAsyncThunk<void, number, { extra: { apiFetch: ApiFetch } }>(
  "members/remove",
  async (userId, { extra: { apiFetch }, dispatch }) => {
    await apiFetch(`/api/account/members/${userId}`, { method: "DELETE" });
    dispatch(fetchMembers());
  }
);

const membersSlice = createSlice({
  name: "members",
  initialState,
  reducers: { clearError: (s) => { s.error = ""; } },
  extraReducers: (b) => {
    b.addCase(fetchMembers.fulfilled, (s, a) => {
      s.members = a.payload.members;
      s.invites = a.payload.invites;
      s.status  = "idle";
    });
    b.addCase(sendInvite.rejected, (s, a) => { s.error = a.error.message ?? "Failed to invite"; });
    b.addCase(sendInvite.fulfilled, (s) => { s.error = ""; });
  },
});

export const { clearError } = membersSlice.actions;
export default membersSlice.reducer;
