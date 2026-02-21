"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type VoiceStatus = "idle" | "connecting" | "recording" | "processing"

interface VoiceState {
  status: VoiceStatus
  transcript: string
  error: string | null
}

interface UseVoiceInputReturn {
  state: VoiceState
  startRecording: () => Promise<void>
  stopRecording: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:17066"
const SONIOX_API_KEY = process.env.NEXT_PUBLIC_SONIOX_API_KEY || ""
const SONIOX_WS_URL = "wss://stt-rt.soniox.com/transcribe-websocket"

// Stop words that trigger finalization
const STOP_WORDS = ["gửi đi", "gui di", "send", "thank you"]

function detectStopWord(text: string): { detected: boolean; command: string } {
  const lower = text.toLowerCase().trim()
  for (const word of STOP_WORDS) {
    if (lower.endsWith(word)) {
      const command = text.slice(0, text.length - word.length).trim()
      return { detected: true, command }
    }
  }
  return { detected: false, command: text }
}

function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16Array
}

/**
 * Simplified voice input hook for guided-AI-coding.
 *
 * Flow: Mic → Soniox STT → stop word detection → Grok correction → fill input
 */
export function useVoiceInput(
  onCorrectedText: (text: string) => void
): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceState>({
    status: "idle",
    transcript: "",
    error: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const transcriptRef = useRef<string>("")

  const updateState = useCallback((partial: Partial<VoiceState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }, [])

  const cleanup = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    wsRef.current?.close()
    wsRef.current = null
    transcriptRef.current = ""
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  const correctAndDeliver = useCallback(
    async (rawText: string) => {
      if (!rawText.trim()) {
        updateState({ status: "idle" })
        return
      }
      updateState({ status: "processing", transcript: rawText })

      try {
        const res = await fetch(`${API_URL}/api/voice/correct`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: rawText }),
        })
        if (!res.ok) throw new Error(`Correction failed: ${res.status}`)
        const data = await res.json()
        onCorrectedText(data.corrected || rawText)
      } catch (err) {
        console.error("[Voice] Correction error:", err)
        // Fallback: use raw transcript
        onCorrectedText(rawText)
      }
      updateState({ status: "idle", transcript: "" })
    },
    [onCorrectedText, updateState]
  )

  const startRecording = useCallback(async () => {
    if (!SONIOX_API_KEY) {
      updateState({
        status: "idle",
        error: "NEXT_PUBLIC_SONIOX_API_KEY not configured",
      })
      return
    }

    updateState({ status: "connecting", transcript: "", error: null })
    transcriptRef.current = ""

    try {
      // 1. Get microphone
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      mediaStreamRef.current = mediaStream

      // 2. Connect to Soniox WebSocket
      const ws = new WebSocket(SONIOX_WS_URL)
      wsRef.current = ws

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve()
        ws.onerror = () => reject(new Error("Soniox WebSocket failed"))
        setTimeout(() => reject(new Error("Soniox connection timeout")), 10000)
      })

      // 3. Send config
      ws.send(
        JSON.stringify({
          api_key: SONIOX_API_KEY,
          model: "stt-rt-v4",
          sample_rate: 16000,
          num_channels: 1,
          audio_format: "pcm_s16le",
          language_hints: ["vi", "en"],
          language_hints_strict: true,
        })
      )

      // 4. Handle incoming transcripts
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.error_message) {
            console.error("[Voice] Soniox error:", data.error_message)
            return
          }
          if (data.tokens) {
            let finalText = ""
            let interimText = ""
            for (const token of data.tokens) {
              if (token.is_final) {
                finalText += token.text
              } else {
                interimText += token.text
              }
            }
            transcriptRef.current += finalText
            const fullTranscript = transcriptRef.current + interimText
            updateState({ transcript: fullTranscript })

            // Check for stop word in final text
            if (finalText) {
              const { detected, command } = detectStopWord(
                transcriptRef.current
              )
              if (detected && command.trim()) {
                cleanup()
                correctAndDeliver(command)
              }
            }
          }
        } catch {
          // Skip non-JSON messages
        }
      }

      ws.onclose = () => {
        // Only update if we're still in recording state
        setState((prev) =>
          prev.status === "recording"
            ? { ...prev, status: "idle" }
            : prev
        )
      }

      // 5. Start audio capture
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(mediaStream)
      const processor = audioContext.createScriptProcessor(1024, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (event) => {
        const float32Data = event.inputBuffer.getChannelData(0)
        const int16Data = float32ToInt16(float32Data)
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(int16Data.buffer)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      updateState({ status: "recording" })
    } catch (err) {
      console.error("[Voice] Start recording error:", err)
      cleanup()
      updateState({
        status: "idle",
        error:
          err instanceof Error ? err.message : "Failed to start recording",
      })
    }
  }, [cleanup, correctAndDeliver, updateState])

  const stopRecording = useCallback(() => {
    const currentTranscript = transcriptRef.current.trim()
    cleanup()

    if (currentTranscript) {
      // Send whatever we have for correction
      correctAndDeliver(currentTranscript)
    } else {
      updateState({ status: "idle", transcript: "" })
    }
  }, [cleanup, correctAndDeliver, updateState])

  return {
    state,
    startRecording,
    stopRecording,
  }
}
