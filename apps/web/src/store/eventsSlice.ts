import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { ApiFetch } from "./index";

export type PulseEvent = {
  id: number;
  idempotency_key: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type State = { items: PulseEvent[]; status: "idle" | "loading" | "error" };

const initialState: State = { items: [], status: "idle" };

export const fetchEvents = createAsyncThunk<PulseEvent[], void, { extra: { apiFetch: ApiFetch } }>(
  "events/fetch",
  async (_, { extra: { apiFetch } }) => {
    const res = await apiFetch("/api/events");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }
);

export const ingestEvent = createAsyncThunk<
  void,
  { idempotencyKey: string; type: string; payload: Record<string, unknown> },
  { extra: { apiFetch: ApiFetch } }
>("events/ingest", async (body, { extra: { apiFetch }, dispatch }) => {
  await apiFetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  dispatch(fetchEvents());
});

const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchEvents.pending,   (s) => { s.status = "loading"; });
    b.addCase(fetchEvents.fulfilled, (s, a) => { s.status = "idle"; s.items = a.payload; });
    b.addCase(fetchEvents.rejected,  (s) => { s.status = "error"; });
  },
});

export default eventsSlice.reducer;
