import axios from "axios";

export type FieldErrors = Record<string, string[]>;

export const NETWORK_ERROR_MESSAGE =
  "通信に失敗しました。時間をおいて再度お試しください。";

const UNKNOWN_ERROR_MESSAGE =
  "エラーが発生しました。時間をおいて再度お試しください。";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string | null,
    readonly fieldErrors: FieldErrors,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFieldErrors(value: unknown): FieldErrors {
  if (!isRecord(value)) {
    return {};
  }

  const fieldErrors: FieldErrors = {};
  for (const [field, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) {
      fieldErrors[field] = messages.filter(
        (m): m is string => typeof m === "string",
      );
    }
  }
  return fieldErrors;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (!axios.isAxiosError(error) || !error.response) {
    return new ApiError(0, NETWORK_ERROR_MESSAGE, null, {}, null);
  }

  const body: unknown = error.response.data;
  const data = isRecord(body) ? body : {};

  return new ApiError(
    error.response.status,
    typeof data.message === "string" ? data.message : UNKNOWN_ERROR_MESSAGE,
    typeof data.code === "string" ? data.code : null,
    toFieldErrors(data.errors),
    body,
  );
}
