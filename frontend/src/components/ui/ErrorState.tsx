import { Button } from "./Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-8 text-center"
    >
      <p className="text-sm text-zinc-700">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        再読み込み
      </Button>
    </div>
  );
}
