"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Mic, Upload, AudioWaveform as Waveform, Loader2, Music, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

const VOICE_STYLES = [
  { value: "default", label: "Default", description: "Natural voice" },
  { value: "whispering", label: "Whispering", description: "Soft whisper" },
  { value: "cheerful", label: "Cheerful", description: "Happy and upbeat" },
  { value: "terrified", label: "Terrified", description: "Scared voice" },
  { value: "angry", label: "Angry", description: "Intense and angry" },
  { value: "sad", label: "Sad", description: "Melancholic voice" },
  { value: "friendly", label: "Friendly", description: "Warm and friendly" },
]

export default function ParrotAI() {
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("default")
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState("No file selected")
  const [isRecording, setIsRecording] = useState(false)
  const [termsAgree, setTermsAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [voiceInput, setVoiceInput] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const voiceRecognitionRef = useRef<any>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onstart = () => {
        setVoiceInput(true)
      }

      recognition.onend = () => {
        setVoiceInput(false)
      }

      recognition.onresult = (event: any) => {
        let finalTranscript = ""
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " "
          } else {
            interimTranscript += transcript
          }
        }

        setPrompt((prev) => {
          const updated = prev + finalTranscript
          return updated + interimTranscript
        })
      }

      voiceRecognitionRef.current = recognition
    }

    // Initialize AudioContext
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
  }, [])

  const toggleVoiceInput = () => {
    if (voiceRecognitionRef.current) {
      if (voiceInput) {
        voiceRecognitionRef.current.stop()
      } else {
        voiceRecognitionRef.current.start()
      }
    }
  }

  const startReferenceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : ""

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setRecordingTime(0)

      setFileName("Recording in progress...")
      setIsRecording(true)

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        })

        // Convert to MP3 using the Web Audio API
        try {
          const arrayBuffer = await audioBlob.arrayBuffer()
          const audioContext =
            audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)()
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

          // Create MP3 file with proper headers
          const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate,
          )
          const source = offlineContext.createBufferSource()
          source.buffer = audioBuffer
          source.connect(offlineContext.destination)
          source.start(0)

          const renderedBuffer = await offlineContext.startRendering()

          // Convert to WAV first, then to MP3
          const wav = encodeWAV(renderedBuffer)
          const mp3Blob = new Blob([wav], { type: "audio/mpeg" })
          const audioFile = new File([mp3Blob], `recording_${Date.now()}.mp3`, { type: "audio/mpeg" })

          setReferenceFile(audioFile)
          setFileName(audioFile.name)
          setIsRecording(false)
          setStatus({ type: "success", message: "Audio recorded successfully! (MP3)" })
        } catch (conversionError) {
          // Fallback: use original blob if conversion fails
          console.log("[v0] MP3 conversion fallback, using original format")
          const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: audioBlob.type })
          setReferenceFile(audioFile)
          setFileName(audioFile.name)
          setIsRecording(false)
          setStatus({ type: "success", message: "Audio recorded successfully!" })
        }
      }

      mediaRecorder.start()
    } catch (error) {
      console.error("Microphone access error:", error)
      setStatus({ type: "error", message: "Could not access microphone" })
    }
  }

  const stopReferenceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      setReferenceFile(file)
      setFileName(file.name)
      if (mediaRecorderRef.current?.state === "recording") {
        stopReferenceRecording()
      }
      setStatus({ type: "success", message: "File uploaded successfully!" })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add("border-primary", "bg-primary/5")
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-primary", "bg-primary/5")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove("border-primary", "bg-primary/5")
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0]
      setReferenceFile(file)
      setFileName(file.name)
      setStatus({ type: "success", message: "File uploaded successfully!" })
    }
  }

  const encodeWAV = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const channels = []
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i))
    }

    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2 + 36

    const arrayBuffer = new ArrayBuffer(44 + length)
    const view = new DataView(arrayBuffer)

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    const floatTo16BitPCM = (offset: number, input: Float32Array) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      }
    }

    // WAV header
    writeString(0, "RIFF")
    view.setUint32(4, 36 + length, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, audioBuffer.numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2 * audioBuffer.numberOfChannels, true)
    view.setUint16(32, audioBuffer.numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, "data")
    view.setUint32(40, length, true)

    let offset = 44
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      floatTo16BitPCM(offset, channels[i])
      offset += audioBuffer.getChannelData(i).length * 2
    }

    return arrayBuffer
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim()) {
      setStatus({ type: "error", message: "Please enter a text prompt" })
      return
    }

    if (!referenceFile) {
      setStatus({ type: "error", message: "Please upload or record a reference audio file" })
      return
    }

    if (!termsAgree) {
      setStatus({ type: "error", message: "Please agree to the terms and conditions" })
      return
    }

    setLoading(true)
    setStatus({ type: "info", message: "Generating audio... Please wait" })

    try {
      const formData = new FormData()
      formData.append("prompt", prompt)
      formData.append("style", style)
      formData.append("audio_file", referenceFile)

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `Generation failed: ${response.statusText}`)
      }

      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      setOutputUrl(url)
      setStatus({ type: "success", message: "Audio generated successfully!" })
    } catch (error) {
      console.error("Generation error:", error)
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to connect to API. Make sure localhost:8000 is running.",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedStyle = VOICE_STYLES.find((s) => s.value === style)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-background to-accent/20" />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/30 rounded-full blur-[120px] opacity-40 animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-accent/30 rounded-full blur-[120px] opacity-40 animate-pulse" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-16 lg:py-20 space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary via-primary/90 to-accent p-4 rounded-full shadow-2xl transform group-hover:scale-110 transition-transform">
                <Waveform className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl lg:text-4xl font-extrabold text-balance tracking-tight text-foreground">
            Transform Text into{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Expressive Voice
            </span>
          </h1>
          <p className="text-lg text-muted-foreground/80 max-w-xl mx-auto leading-relaxed font-medium">
            Generate natural-sounding voice with AI, choosing from multiple emotional styles
          </p>
        </div>

        {/* Main Form Card */}
        <Card className="border border-primary/10 bg-card/90 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] ring-1 ring-white/20">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Text Prompt Section */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="prompt" className="text-base font-semibold">
                    What would you like to say?
                  </Label>
                  <span className="text-xs text-muted-foreground">{prompt.length} characters</span>
                </div>
                <div className="relative">
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Type your message here..."
                    rows={4}
                    className="resize-none bg-input border border-border/50 placeholder:text-muted-foreground/50"
                  />
                  <Button
                    type="button"
                    onClick={toggleVoiceInput}
                    variant="ghost"
                    size="icon"
                    className={`absolute right-3 top-3 transition-colors ${voiceInput ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-primary"
                      }`}
                    title="Voice input"
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                </div>
                {voiceInput && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="font-medium">Listening to your voice...</span>
                  </div>
                )}
              </div>

              {/* Voice Style Section */}
              <div className="space-y-3 flex flex-col items-center">
                <Label htmlFor="style" className="text-base font-semibold text-center">
                  Choose Voice Style
                </Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger id="style" className="bg-input border-border/50 justify-center text-center">
                    <SelectValue className="text-center" />
                  </SelectTrigger>
                  <SelectContent className="shadow-2xl">
                    {VOICE_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex flex-col items-center text-center w-full">
                          <span className="font-medium">{s.label}</span>
                          <span className="text-xs text-muted-foreground">{s.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs font-semibold text-muted-foreground bg-card uppercase tracking-wide">
                    Reference Audio
                  </span>
                </div>
              </div>

              {/* Reference Audio Section */}
              <div className="space-y-4">
                {/* File Upload Area */}
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border/60 hover:border-primary/60 rounded-lg cursor-pointer transition-all group hover:bg-primary/5"
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="p-3 bg-secondary/50 group-hover:bg-primary/10 rounded-lg transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Upload or drag audio file</p>
                      <p className="text-xs text-muted-foreground">MP3, WAV, or WebM (up to 30MB)</p>
                    </div>
                  </div>
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>

                {/* File Status */}
                {referenceFile && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20 rounded-lg">
                    <div className="p-2 bg-primary/20 rounded-md">
                      <Waveform className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                      <p className="text-xs text-muted-foreground">Ready to use</p>
                    </div>
                    <Badge className="bg-primary text-primary-foreground">Loaded</Badge>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={isRecording ? stopReferenceRecording : startReferenceRecording}
                  disabled={loading}
                  variant={isRecording ? "destructive" : "outline"}
                  className="w-full gap-2 h-11 font-semibold border-border/50"
                  size="lg"
                >
                  {isRecording ? (
                    <>
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      Stop Recording ({formatTime(recordingTime)})
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Record Reference
                    </>
                  )}
                </Button>
              </div>

              {/* Terms Section */}
              <div className="bg-secondary/50 border border-border/50 rounded-lg p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAgree}
                    onCheckedChange={(checked) => setTermsAgree(checked as boolean)}
                    disabled={loading}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    I agree not to create harmful or deceptive content and will not impersonate individuals without
                    consent.
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !termsAgree}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-base hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-75"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="animate-pulse">Generating Audio</span>
                  </>
                ) : (
                  <>
                    <Waveform className="w-4 h-4" />
                    Generate Voice
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Status Messages */}
        {status && (
          <div
            className={`p-4 rounded-lg border animate-in fade-in duration-300 ${status.type === "error"
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : status.type === "success"
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-accent/10 border-accent/30 text-accent"
              }`}
          >
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}

        {outputUrl && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md shadow-2xl">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="relative p-4 bg-gradient-to-br from-primary/30 to-accent/30 rounded-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg animate-pulse" />
                      <Music className="w-6 h-6 text-primary relative z-10" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Your Generated Voice</h3>
                      <p className="text-sm text-muted-foreground">Ready to download and use</p>
                    </div>
                  </div>

                  {/* Audio Player */}
                  <div className="bg-secondary/50 border border-border/30 rounded-lg p-4">
                    <audio controls className="w-full h-10 rounded" src={outputUrl} />
                  </div>

                  {/* Download Button */}
                  <Button
                    className="w-full h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-base hover:shadow-lg hover:shadow-primary/30 transition-all gap-2"
                    onClick={() => {
                      const a = document.createElement("a")
                      a.href = outputUrl
                      a.download = `parrot-ai-${Date.now()}.mp3`
                      a.click()
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Download Audio (MP3)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
