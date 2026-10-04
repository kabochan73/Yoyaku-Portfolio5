import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError, NETWORK_ERROR_MESSAGE } from "./api-error";

export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  fields: readonly Path<T>[],
): void {
  if (!(error instanceof ApiError)) {
    setError("root.server", { type: "server", message: NETWORK_ERROR_MESSAGE });
    return;
  }

  const formLevelMessages: string[] = [];
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const message = messages[0];
    if (message === undefined) {
      continue;
    }

    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: "server", message });
    } else {
      formLevelMessages.push(message);
    }
  }

  if (Object.keys(error.fieldErrors).length === 0) {
    formLevelMessages.push(error.message);
  }

  if (formLevelMessages.length > 0) {
    setError("root.server", {
      type: "server",
      message: formLevelMessages.join("\n"),
    });
  }
}
