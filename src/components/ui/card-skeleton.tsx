import { Skeleton } from "./skeleton";

export function CardSkeleton() {
  return (
    <div className="bg-card p-6 rounded-lg border border-border">
      <Skeleton className="h-4 w-1/4 mb-4" />
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card p-6 rounded-lg border border-border">
      <Skeleton className="h-4 w-1/2 mb-3" />
      <Skeleton className="h-8 w-1/3 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-1/3 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}
