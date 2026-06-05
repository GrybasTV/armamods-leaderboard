import { Card, CardContent } from './Card';

export function ModCardSkeleton() {
  return (
    <Card className="border-white/5 border-l-2 border-l-zinc-800 bg-black/40 animate-pulse">
      <CardContent className="p-5 space-y-4">
        <div className="h-3 w-16 bg-white/10 rounded" />
        <div className="h-6 w-full bg-white/10 rounded" />
        <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-3">
          <div className="h-10 bg-white/5 rounded" />
          <div className="h-10 bg-white/5 rounded" />
        </div>
        <div className="h-1 w-full bg-white/10 rounded" />
        <div className="h-8 w-full bg-white/5 rounded" />
      </CardContent>
    </Card>
  );
}

export function ModListSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 min-h-[1200px]"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <ModCardSkeleton key={i} />
      ))}
    </div>
  );
}
