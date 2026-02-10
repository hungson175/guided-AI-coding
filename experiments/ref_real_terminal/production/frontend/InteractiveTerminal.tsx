"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { Terminal } from "xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "xterm/css/xterm.css"
import { NETWORK, TERMINAL } from "@/lib/config"
import { cn } from "@/lib/utils"

interface InteractiveTerminalProps {
  /** JWT token for authentication */
  token: string
  /** Whether the terminal tab is visible */
  isVisible: boolean
  /** Named terminal session (default: "default") */
  terminalName?: string
}

// Production terminal WebSocket URL (via Cloudflare tunnel)
const TERMINAL_WS_URL = process.env.NEXT_PUBLIC_TERMINAL_WS_URL

// Flow control threshold (50KB)
const ACK_THRESHOLD = 50000

// Connection status type
type ConnectionStatus = "connecting" | "connected" | "disconnected"

export function InteractiveTerminal({
  token,
  isVisible,
  terminalName = "default",
}: InteractiveTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const bytesReceivedRef = useRef(0)

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting")
  const [showStatus, setShowStatus] = useState(true)

  // Create xterm ONCE on mount (preserves scrollback across reconnects)
  useEffect(() => {
    if (!terminalRef.current) return

    // Create terminal
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: TERMINAL.FONT_SIZE,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#ffffff",
      },
    })

    // Add addons
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    // Mount terminal
    terminal.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
      }
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      terminal.dispose()
    }
  }, [])

  // Connect Socket.io separately (allows reconnection without recreating xterm)
  const connectSocket = useCallback(() => {
    if (!xtermRef.current || !token) return

    const terminal = xtermRef.current

    // Build Socket.io URL
    let wsUrl: string
    if (TERMINAL_WS_URL) {
      // Production: use configured terminal WebSocket URL
      wsUrl = TERMINAL_WS_URL
    } else {
      // Development: use localhost with port
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      wsUrl = `${wsProtocol}//${window.location.hostname}:${NETWORK.TERMINAL_PORT}`
    }

    // Create Socket.io connection
    const socket = io(wsUrl, {
      query: {
        token,
        terminal: terminalName,
      },
      transports: ["websocket"],
    })

    socketRef.current = socket

    // Connection lifecycle
    socket.on("connect", () => {
      setConnectionStatus("connected")
      setShowStatus(true)

      // Auto-hide "Connected" status after 2s
      setTimeout(() => {
        setShowStatus(false)
      }, 2000)

      // Send initial resize
      const { cols, rows } = terminal
      socket.emit("resize", { cols, rows })
    })

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected")
      setShowStatus(true)
      terminal.write("\r\n\x1b[31mConnection closed\x1b[0m\r\n")
    })

    // Receive terminal data
    socket.on("data", (data: string) => {
      terminal.write(data)

      // Flow control: Track bytes and send ACK
      bytesReceivedRef.current += data.length
      if (bytesReceivedRef.current >= ACK_THRESHOLD) {
        socket.emit("ack", bytesReceivedRef.current)
        bytesReceivedRef.current = 0
      }
    })

    // Handle exit
    socket.on("exit", (code: number) => {
      terminal.write(`\r\n\x1b[33mProcess exited with code ${code}\x1b[0m\r\n`)
    })

    // Forward terminal input to Socket.io
    terminal.onData((data) => {
      socket.emit("data", data)
    })

    // Handle terminal resize
    terminal.onResize(({ cols, rows }) => {
      socket.emit("resize", { cols, rows })
    })

    return () => {
      socket.disconnect()
    }
  }, [token, terminalName])

  // Connect/disconnect Socket.io when visibility changes
  useEffect(() => {
    if (isVisible) {
      const cleanup = connectSocket()
      return cleanup
    }
  }, [isVisible, connectSocket])

  // Fit terminal when tab becomes visible
  useEffect(() => {
    if (isVisible && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 100)
    }
  }, [isVisible])

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Connection status indicator */}
      {showStatus && (
        <div
          className="absolute top-2 right-2 z-10 px-2 py-1 rounded text-xs font-mono"
          data-testid="connection-status"
        >
          {connectionStatus === "connecting" && (
            <span className="text-yellow-500">Connecting...</span>
          )}
          {connectionStatus === "connected" && (
            <span className="text-green-500">Connected</span>
          )}
          {connectionStatus === "disconnected" && (
            <span className="text-red-500">Disconnected</span>
          )}
        </div>
      )}

      {/* Terminal container */}
      <div
        ref={terminalRef}
        data-testid="terminal-container"
        className="flex-1 w-full bg-[#1e1e1e]"
        style={{ minHeight: "400px" }}
      />
    </div>
  )
}
