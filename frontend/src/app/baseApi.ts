import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { logout } from "../features/auth/authSlice";

/**
 * The API is served by the same host as the SPA in production, and proxied by
 * Vite in development, so "/api" is right in both cases.
 */
const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth?: { token?: string | null } })?.auth?.token;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

/**
 * A 401 means the shift's token expired mid-service. Dropping straight back to
 * the login screen is the only honest response - silently failing would leave a
 * cashier tapping a dead "Print Bill" button.
 */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !window.location.pathname.startsWith("/login")) {
    api.dispatch(logout());
    api.dispatch(baseApi.util.resetApiState());
    window.location.href = "/login";
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Auth",
    "Users",
    "Settings",
    "Printers",
    "Backups",
    "Tables",
    "Floor",
    "Categories",
    "Products",
    "Menu",
    "Orders",
    "Employees",
    "Payroll",
    "Credit",
    "Expenses",
    "KitchenCategories",
    "KitchenItems",
    "Closings",
    "Reports",
  ],
  endpoints: () => ({}),
});

export default baseApi;
