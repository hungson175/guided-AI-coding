'use client'

import React from "react"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendChatMessage, sendTerminalCommand, readTerminalOutput } from '@/lib/api'

interface Message {
  id: string
  type: 'user' | 'advisor'
  text: string
}

export function RightPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'advisor',
      text: "Hi! I'm your AI Advisor. You have a real terminal on the left — try typing 'ls' or 'pwd'. Ask me anything about building software!",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function isTerminalCommand(text: string): string | null {
    const trimmed = text.trim()
    if (trimmed.startsWith('$ ')) return trimmed.slice(2)
    return null
  }

  function stripAnsi(text: string): string {
    return text
      .replace(/\x1b\][^\x07]*\x07/g, '')       // OSC sequences (title sets)
      .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')   // CSI sequences (colors, cursor, bracketed paste)
      .replace(/\x1b[()][0-9A-B]/g, '')          // charset sequences
      .replace(/\r/g, '')                         // carriage returns
  }

  const addMessage = (type: 'user' | 'advisor', text: string) => {
    setMessages((prev) => [...prev, {
      id: Date.now().toString() + Math.random(),
      type,
      text,
    }])
  }

  const handleTerminalCommand = async (command: string) => {
    addMessage('advisor', `Sending to terminal: \`${command}\``)
    try {
      await sendTerminalCommand(command)
      await new Promise((resolve) => setTimeout(resolve, 5000))
      const output = await readTerminalOutput(5)
      const clean = stripAnsi(output).trim()
      addMessage('advisor', `Terminal output:\n\`\`\`\n${clean}\n\`\`\``)
    } catch {
      addMessage('advisor', 'Failed to communicate with the terminal. Is it running?')
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
    }
    setMessages((prev) => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setIsLoading(true)

    const command = isTerminalCommand(currentInput)
    if (command) {
      await handleTerminalCommand(command)
      setIsLoading(false)
      return
    }

    try {
      const response = await sendChatMessage(currentInput)
      const advisorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'advisor',
        text: response.text,
      }
      setMessages((prev) => [...prev, advisorMessage])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: 'advisor',
          text: 'Sorry, I could not reach the backend. Is it running?',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-muted text-foreground rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground px-4 py-2 rounded-lg rounded-bl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="sm">
            Send
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          💡 Prefix with $ to run in terminal (e.g. "$ ls") or ask a question
        </p>
      </div>
    </div>
  )
}
