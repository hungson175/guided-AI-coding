'use client'

import { InteractiveTerminal } from '@/components/interactive-terminal'

export function LeftPanel() {
  return (
    <div className="flex flex-col h-full bg-[#0e1117]">
      <div className="h-9 flex items-center px-4 bg-[#161b22] border-b border-[#2a2f3a]">
        <div className="flex gap-1.5 mr-3">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-xs text-[#8b949e] font-medium">Terminal</span>
      </div>
      <InteractiveTerminal />
    </div>
  )
}
