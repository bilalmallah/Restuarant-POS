import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export type ApiError = FetchBaseQueryError | SerializedError;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryParams = Record<string, string | number | boolean | undefined | null>;

type QueryArgs = {
  url: string;
  method: HttpMethod;
  body?: unknown;
};

/**
 * Small wrapper so every endpoint reads the same way and empty filters never
 * end up in the URL as "?from=&to=" - which Postgres would happily treat as a
 * real (and empty) date range.
 */
export const buildQuery =
  (url: string, method: HttpMethod = "GET") =>
  ({ body, params = {} }: { body?: unknown; params?: QueryParams } = {}): QueryArgs => {
    const search = new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => [key, String(value)])
    ).toString();

    return {
      url: search ? `${url}?${search}` : url,
      method,
      ...(method !== "GET" && body !== undefined ? { body } : {}),
    };
  };

/** Pulls the human sentence out of whatever shape the failure arrived in. */
export const errorMessage = (error: unknown, fallback = "Something went wrong"): string => {
  if (typeof error === "object" && error !== null && "data" in error && error.data) {
    const data = error.data as { message?: string; error?: string };
    if (data.message || data.error) return (data.message ?? data.error)!;
  }

  if (typeof error === "object" && error !== null && "error" in error) {
    const value = (error as { error?: string }).error;
    if (typeof value === "string") return value;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const value = (error as { message?: string }).message;
    if (typeof value === "string") return value;
  }

  return fallback;
};
