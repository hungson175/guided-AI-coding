const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:17066"

function getTerminalUrl(): string {
  if (process.env.NEXT_PUBLIC_TERMINAL_WS_URL) return process.env.NEXT_PUBLIC_TERMINAL_WS_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:17076`
  return 'http://localhost:17076'
}

export async function sendTerminalCommand(command: string): Promise<void> {
  const res = await fetch(`${getTerminalUrl()}/api/terminals/default/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: command + '\n' }),
  })
  if (!res.ok) throw new Error(`Terminal send failed: ${res.status}`)
}
