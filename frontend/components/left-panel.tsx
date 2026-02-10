'use client'

import { InteractiveTerminal } from '@/components/interactive-terminal'

export function LeftPanel() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="bg-muted px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Terminal</h2>
      </div>
      <InteractiveTerminal />
    </div>
  )
}
