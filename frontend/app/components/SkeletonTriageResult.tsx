"use client"

import SkeletonCircle from "./SkeletonCircle"
import SkeletonText from "./SkeletonText"

export default function SkeletonTriageResult() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading assessment results">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Left col: MTS level + specialty */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <SkeletonCircle />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-2 w-24" />
              <div className="skeleton h-6 w-32" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="skeleton h-2 w-28" />
            <div className="skeleton h-5 w-40 mt-1" />
          </div>
        </div>
        {/* Right col: doctor card */}
        <div className="rounded-md border border-border p-4 space-y-3">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-3 w-36" />
          <div className="skeleton h-8 w-full mt-3" />
        </div>
      </div>
      {/* Reasoning */}
      <div className="border-t border-border pt-5 space-y-2">
        <div className="skeleton h-2 w-20 mb-2" />
        <SkeletonText lines={3} />
      </div>
    </div>
  )
}
