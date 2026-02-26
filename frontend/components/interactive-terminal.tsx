'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const TERMINAL_WS_URL = process.env.NEXT_PUBLIC_TERMINAL_WS_URL
const TERMINAL_PORT = 17076
const ACK_THRESHOLD = 50000

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface InteractiveTerminalProps {
  terminalName?: string
  onSocketReady?: (socket: Socket) => void
}

export function InteractiveTerminal({ terminalName = 'default', onSocketReady }: InteractiveTerminalProps = {}) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const bytesReceivedRef = useRef(0)

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [showStatus, setShowStatus] = useState(true)

  // Create xterm once on mount
  useEffect(() => {
    if (!terminalRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
      },
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    const handleResize = () => {
      fitAddonRef.current?.fit()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      terminal.dispose()
    }
  }, [])

  const connectSocket = useCallback(() => {
    if (!xtermRef.current) return

    const terminal = xtermRef.current

    let wsUrl: string
    if (TERMINAL_WS_URL) {
      wsUrl = TERMINAL_WS_URL
    } else {
      wsUrl = `http://${window.location.hostname}:${TERMINAL_PORT}`
    }

    const socket = io(wsUrl, {
      query: { terminal: terminalName },
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnectionStatus('connected')
      setShowStatus(true)
      setTimeout(() => setShowStatus(false), 2000)

      const { cols, rows } = terminal
      socket.emit('resize', { cols, rows })

      onSocketReady?.(socket)
    })

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
      setShowStatus(true)
      terminal.write('\r\n\x1b[31mConnection closed\x1b[0m\r\n')
    })

    socket.on('data', (data: string) => {
      terminal.write(data)
      bytesReceivedRef.current += data.length
      if (bytesReceivedRef.current >= ACK_THRESHOLD) {
        socket.emit('ack', bytesReceivedRef.current)
        bytesReceivedRef.current = 0
      }
    })

    socket.on('exit', (code: number) => {
      terminal.write(`\r\n\x1b[33mProcess exited with code ${code}\x1b[0m\r\n`)
    })

    const onDataDisposable = terminal.onData((data) => {
      socket.emit('data', data)
    })

    const onResizeDisposable = terminal.onResize(({ cols, rows }) => {
      socket.emit('resize', { cols, rows })
    })

    return () => {
      onDataDisposable.dispose()
      onResizeDisposable.dispose()
      socket.disconnect()
    }
  }, [terminalName, onSocketReady])

  // Connect socket on mount
  useEffect(() => {
    const cleanup = connectSocket()
    return cleanup
  }, [connectSocket])

  // ResizeObserver to fit terminal when container resizes
  useEffect(() => {
    if (!terminalRef.current) return
    const observer = new ResizeObserver(() => {
      fitAddonRef.current?.fit()
    })
    observer.observe(terminalRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative flex-1 flex flex-col">
      {showStatus && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded text-xs font-mono">
          {connectionStatus === 'connecting' && (
            <span className="text-yellow-500">Connecting...</span>
          )}
          {connectionStatus === 'connected' && (
            <span className="text-green-500">Connected</span>
          )}
          {connectionStatus === 'disconnected' && (
            <span className="text-red-500">Disconnected</span>
          )}
        </div>
      )}

      <div
        ref={terminalRef}
        className="flex-1 w-full bg-[#1e1e1e]"
        style={{ minHeight: '400px' }}
      />
    </div>
  )
}
