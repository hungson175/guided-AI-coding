import AnsiToHtml from 'ansi-to-html'

// Singleton converter matching GitHub dark theme
const converter = new AnsiToHtml({
  fg: '#c9d1d9',
  bg: 'transparent',
  escapeXML: true,
  stream: false,
  newline: true,
})

/**
 * Parse ANSI escape sequences to HTML
 */
export function parseAnsiToHtml(text: string): string {
  return converter.toHtml(text)
}
