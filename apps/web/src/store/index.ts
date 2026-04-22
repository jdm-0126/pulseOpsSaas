import { configureStore } from "@reduxjs/toolkit";
import eventsReducer from "./eventsSlice";
import analyticsReducer from "./analyticsSlice";
import membersReducer from "./membersSlice";
import billingReducer from "./billingSlice";
import type { useAuth } from "../hooks/useAuth";

export type ApiFetch = ReturnType<typeof useAuth>["apiFetch"];

export const createStore = (apiFetch: ApiFetch) =>
  configureStore({
    reducer: {
      events:    eventsReducer,
      analytics: analyticsReducer,
      members:   membersReducer,
      billing:   billingReducer,
    },
    middleware: (getDefault) =>
      getDefault({ thunk: { extraArgument: { apiFetch } } }),
  });

export type AppStore    = ReturnType<typeof createStore>;
export type RootState   = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
