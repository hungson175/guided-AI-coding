const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:17066"

function getTerminalUrl(): string {
  if (process.env.NEXT_PUBLIC_TERMINAL_WS_URL) return process.env.NEXT_PUBLIC_TERMINAL_WS_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:17076`
  return 'http://localhost:17076'
}

interface ChatResponse {
  text: string
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`)
  return res.json()
}

export async function sendTerminalCommand(command: string): Promise<void> {
  const res = await fetch(`${getTerminalUrl()}/api/terminals/default/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: command + '\n' }),
  })
  if (!res.ok) throw new Error(`Terminal send failed: ${res.status}`)
}

export async function readTerminalOutput(lines: number): Promise<string> {
  const res = await fetch(`${getTerminalUrl()}/api/terminals/default/read?lines=${lines}`)
  if (!res.ok) throw new Error(`Terminal read failed: ${res.status}`)
  const data = await res.json()
  return data.output
}
