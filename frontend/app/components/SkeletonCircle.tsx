"use client"

interface SkeletonCircleProps {
  size?: string
  className?: string
}

export default function SkeletonCircle({ size = "w-14 h-14", className = "" }: SkeletonCircleProps) {
  return <div className={`skeleton rounded-full ${size} shrink-0 ${className}`} />
}
