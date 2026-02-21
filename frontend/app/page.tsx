'use client'

import { LeftPanel } from '@/components/left-panel'
import { RightPanel } from '@/components/right-panel'

export default function Page() {
  return (
    <div className="flex h-screen bg-[#141820]">
      <div className="flex-[7] min-w-0">
        <LeftPanel />
      </div>
      <div className="w-px bg-[#2a2f3a]" />
      <div className="flex-[3] min-w-0">
        <RightPanel />
      </div>
    </div>
  )
}
