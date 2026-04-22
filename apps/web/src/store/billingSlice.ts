import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { ApiFetch } from "./index";

type Usage = { metric: string; total: number };
type State = { usage: Usage[]; portalLoading: boolean };

const initialState: State = { usage: [], portalLoading: false };

export const fetchUsage = createAsyncThunk<Usage[], void, { extra: { apiFetch: ApiFetch } }>(
  "billing/fetchUsage",
  async (_, { extra: { apiFetch } }) => {
    const res = await apiFetch("/api/billing/usage");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }
);

export const openBillingPortal = createAsyncThunk<void, void, { extra: { apiFetch: ApiFetch } }>(
  "billing/portal",
  async (_, { extra: { apiFetch } }) => {
    const res = await apiFetch("/api/billing/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }
);

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchUsage.fulfilled,          (s, a) => { s.usage = a.payload; });
    b.addCase(openBillingPortal.pending,     (s) => { s.portalLoading = true; });
    b.addCase(openBillingPortal.fulfilled,   (s) => { s.portalLoading = false; });
    b.addCase(openBillingPortal.rejected,    (s) => { s.portalLoading = false; });
  },
});

export default billingSlice.reducer;
