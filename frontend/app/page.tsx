'use client'

import { LeftPanel } from '@/components/left-panel'
import { RightPanel } from '@/components/right-panel'

export default function Page() {
  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - 70% */}
      <div className="flex-1 border-r border-border">
        <LeftPanel />
      </div>

      {/* Right Panel - 30% */}
      <div className="w-[30%] bg-card border-l border-border">
        <RightPanel />
      </div>
    </div>
  )
}
