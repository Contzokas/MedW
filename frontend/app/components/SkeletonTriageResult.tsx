"use client"

export default function SkeletonTriageResult() {
  return (
    <div className="animate-pulse space-y-5 p-2">
      <div className="flex items-center gap-3">
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full rounded bg-muted" />
          <div className="h-2 w-5/6 rounded bg-muted" />
          <div className="h-2 w-4/6 rounded bg-muted" />
        </div>
      </div>
      <div className="flex justify-between gap-3">
        <div className="h-10 w-full rounded-xl bg-muted" />
        <div className="h-10 w-full rounded-xl bg-muted" />
      </div>
    </div>
  )
}
