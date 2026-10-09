import { combineReducers, configureStore, type Reducer } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { persistStore, persistReducer } from "redux-persist";

import baseApi from "./baseApi";
import authSlice from "../features/auth/authSlice";

/**
 * Only the session is persisted. Cached server data is deliberately not:
 * a till left open overnight must not show yesterday's floor as today's.
 */
const storage = {
  getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const persistConfig = {
  key: "easy-restaurant",
  storage,
  whitelist: [authSlice.name],
};

const slices = [authSlice];
const reducers: Record<string, Reducer> = {};

for (const slice of slices) reducers[slice.name] = slice.reducer;
reducers[baseApi.reducerPath] = baseApi.reducer;

const rootReducer = combineReducers(reducers);
const persistedReducer = persistReducer(persistConfig, rootReducer) as Reducer;

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/FLUSH",
          "persist/PAUSE",
          "persist/PURGE",
          "persist/REGISTER",
        ],
      },
    }).concat(baseApi.middleware),
});

setupListeners(store.dispatch);

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
