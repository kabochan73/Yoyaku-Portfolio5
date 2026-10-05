import { Skeleton } from "@/components/ui/Skeleton";

export function PageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-4 p-4"
      data-testid="page-skeleton"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
