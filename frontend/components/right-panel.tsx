'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { sendChatMessage, getTutorWsUrl } from '@/lib/api'

function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b\[[0-9;?]*[a-zA-Z~]/g, '')
    .replace(/\x1b[()][0-9A-B]/g, '')
    .replace(/\x1b[=>]/g, '')
    .replace(/\r/g, '')
}

export function RightPanel() {
  const [tutorOutput, setTutorOutput] = useState('')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const outputRef = useRef<HTMLPreElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToBottom = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [tutorOutput, scrollToBottom])

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const url = getTutorWsUrl()
    setWsStatus('connecting')
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onopen = () => setWsStatus('connected')
    ws.onmessage = (event) => setTutorOutput(stripAnsi(event.data))
    ws.onclose = () => {
      setWsStatus('disconnected')
      reconnectTimerRef.current = setTimeout(connectWs, 3000)
    }
    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connectWs()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connectWs])

  const handleSend = async () => {
    if (!input.trim()) return
    const message = input.trim()
    setInput('')
    setIsLoading(true)
    try {
      await sendChatMessage(message)
    } catch {}
    finally { setIsLoading(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0e1117]">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-4 bg-[#161b22] border-b border-[#2a2f3a]">
        <span className="text-xs text-[#e6edf3] font-medium">Tutor</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${
            wsStatus === 'connected' ? 'bg-[#3fb950]' :
            wsStatus === 'connecting' ? 'bg-[#d29922]' :
            'bg-[#f85149]'
          }`} />
          <span className="text-[11px] text-[#8b949e]">{wsStatus}</span>
        </div>
      </div>

      {/* Tutor Output */}
      <pre
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 text-[13px] leading-[1.6] text-[#c9d1d9] bg-[#0e1117] whitespace-pre-wrap break-words"
        style={{ fontFamily: 'Menlo, Monaco, "Courier New", monospace' }}
      >
        {tutorOutput || (
          <span className="text-[#484f58]">Waiting for tutor...</span>
        )}
      </pre>

      {/* Input */}
      <div className="p-3 border-t border-[#2a2f3a] bg-[#161b22]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message tutor..."
            disabled={isLoading}
            className="flex-1 h-9 px-3 text-sm text-[#e6edf3] bg-[#0e1117] rounded-md border border-[#30363d] placeholder:text-[#484f58] focus:outline-none focus:border-[#58a6ff] disabled:opacity-40"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-9 px-4 text-sm font-medium rounded-md bg-[#238636] text-white hover:bg-[#2ea043] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
