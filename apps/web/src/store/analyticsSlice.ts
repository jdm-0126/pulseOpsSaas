import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { ApiFetch } from "./index";

type Summary     = { total_events: string; total_revenue_cents: string; active_days: string } | null;
type DailyEvent  = { date: string; event_type: string; count: string };
type DailyRevenue = { date: string; revenue_cents: string };

type State = {
  summary: Summary;
  eventData: DailyEvent[];
  revenue: DailyRevenue[];
  status: "idle" | "loading" | "error";
};

const initialState: State = { summary: null, eventData: [], revenue: [], status: "idle" };

const dateRange = () => {
  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to   = now.toISOString().slice(0, 10);
  return { from, to };
};

export const fetchAnalytics = createAsyncThunk<
  Pick<State, "summary" | "eventData" | "revenue">,
  void,
  { extra: { apiFetch: ApiFetch } }
>("analytics/fetch", async (_, { extra: { apiFetch } }) => {
  const { from, to } = dateRange();
  const [summary, eventData, revenue] = await Promise.all([
    apiFetch("/api/analytics/summary").then(r => r.json()),
    apiFetch(`/api/analytics/events?from=${from}&to=${to}`).then(r => r.json()),
    apiFetch(`/api/analytics/revenue?from=${from}&to=${to}`).then(r => r.json()),
  ]);
  return {
    summary:   summary ?? null,
    eventData: Array.isArray(eventData) ? eventData : [],
    revenue:   Array.isArray(revenue)   ? revenue   : [],
  };
});

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAnalytics.pending,   (s) => { s.status = "loading"; });
    b.addCase(fetchAnalytics.fulfilled, (s, a) => {
      s.status    = "idle";
      s.summary   = a.payload.summary;
      s.eventData = a.payload.eventData;
      s.revenue   = a.payload.revenue;
    });
    b.addCase(fetchAnalytics.rejected,  (s) => { s.status = "error"; });
  },
});

export default analyticsSlice.reducer;
