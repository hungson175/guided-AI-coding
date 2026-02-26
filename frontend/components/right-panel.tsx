'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { InteractiveTerminal } from '@/components/interactive-terminal'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { Mic, MicOff, Loader2 } from 'lucide-react'

export function RightPanel() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const socketRef = useRef<Socket | null>(null)

  // Voice input: corrected text is typed directly into the terminal
  const handleCorrectedText = useCallback((text: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('data', text)
    }
  }, [])
  const { state: voiceState, startRecording, stopRecording } = useVoiceInput(handleCorrectedText)

  const handleSocketReady = useCallback((socket: Socket) => {
    socketRef.current = socket
    setConnectionStatus('connected')

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
    })
  }, [])

  const handleMicClick = () => {
    if (voiceState.status === 'recording') {
      stopRecording()
    } else if (voiceState.status === 'idle') {
      startRecording()
    }
  }

  const getMicButton = () => {
    const status = voiceState.status
    if (status === 'processing' || status === 'connecting') {
      return (
        <button
          disabled
          className="h-6 w-6 flex items-center justify-center rounded bg-[#30363d] text-[#8b949e] cursor-not-allowed"
          title={status === 'processing' ? 'Processing...' : 'Connecting...'}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </button>
      )
    }
    if (status === 'recording') {
      return (
        <button
          onClick={handleMicClick}
          className="h-6 w-6 flex items-center justify-center rounded bg-[#da3633] text-white hover:bg-[#f85149] relative"
          title="Stop recording (or say 'gửi đi')"
        >
          <MicOff className="w-3.5 h-3.5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#f85149] rounded-full animate-pulse" />
        </button>
      )
    }
    return (
      <button
        onClick={handleMicClick}
        className="h-6 w-6 flex items-center justify-center rounded bg-[#30363d] text-[#c9d1d9] hover:bg-[#484f58] hover:text-white"
        title="Voice input"
      >
        <Mic className="w-3.5 h-3.5" />
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0e1117]">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-4 bg-[#161b22] border-b border-[#2a2f3a]">
        <span className="text-xs text-[#e6edf3] font-medium">Tutor</span>
        <div className="flex items-center gap-2">
          {getMicButton()}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-[#3fb950]' :
              connectionStatus === 'connecting' ? 'bg-[#d29922]' :
              'bg-[#f85149]'
            }`} />
            <span className="text-[11px] text-[#8b949e]">{connectionStatus}</span>
          </div>
        </div>
      </div>

      {/* Voice transcript overlay */}
      <div className="relative flex-1">
        {voiceState.status === 'recording' && voiceState.transcript && (
          <div className="absolute top-0 left-0 right-0 z-10 px-3 py-1.5 bg-[#1c2128]/90 border-b border-[#2a2f3a] text-xs text-[#8b949e]">
            <span className="text-[#f85149] mr-1.5">REC</span>
            {voiceState.transcript}
          </div>
        )}

        {voiceState.error && (
          <div className="absolute top-0 left-0 right-0 z-10 px-3 py-1.5 bg-[#1c2128]/90 border-b border-[#2a2f3a] text-xs text-[#f85149]">
            {voiceState.error}
          </div>
        )}

        <InteractiveTerminal terminalName="tutor" onSocketReady={handleSocketReady} />
      </div>
    </div>
  )
}
