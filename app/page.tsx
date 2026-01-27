"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Mic, Upload, AudioWaveform as Waveform, Loader2, Music, Zap, Play, Pause, Scissors, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VoiceLibrary, SaveVoiceDialog, type Voice } from "@/components/voice-library"
import { ModelSwitcher } from "@/components/model-switcher"
import { VoiceDesignPanel } from "@/components/voice-design-panel"
import { CustomVoicePanel } from "@/components/custom-voice-panel"

export default function ParrotAI() {
  const [prompt, setPrompt] = useState("")
  const [referenceText, setReferenceText] = useState("")
  const [useManualTranscript, setUseManualTranscript] = useState(false)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState("No file selected")
  const [isRecording, setIsRecording] = useState(false)
  const [termsAgree, setTermsAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [voiceInput, setVoiceInput] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null)
  
  // Audio preview and trim state
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [showTrimControls, setShowTrimControls] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Saved Voices State
  const [activeTab, setActiveTab] = useState("upload")
  const [savedVoices, setSavedVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)

  // Model State
  const [currentModel, setCurrentModel] = useState("base")
  const [isSwitchingModel, setIsSwitchingModel] = useState(false)
  const [isGeneratingAux, setIsGeneratingAux] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const voiceRecognitionRef = useRef<any>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchVoices()
  }, [])

  const fetchVoices = async () => {
    try {
      setIsLoadingVoices(true)
      const response = await fetch("http://localhost:8000/api/voices")
      if (response.ok) {
        const data = await response.json()
        setSavedVoices(data)
      }
    } catch (error) {
      console.error("Failed to fetch voices:", error)
    } finally {
      setIsLoadingVoices(false)
    }
  }

  const handleSaveVoice = async (name: string) => {
    if (!referenceFile) return

    const formData = new FormData()
    formData.append("name", name)
    formData.append("file", referenceFile)
    if (useManualTranscript) {
      formData.append("transcript", referenceText)
    }

    try {
      const response = await fetch("http://localhost:8000/api/voices", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to save voice")

      setStatus({ type: "success", message: "Voice saved to library!" })
      fetchVoices() // Refresh list
      setActiveTab("saved") // Switch to saved tab
      setIsSaveDialogOpen(false)
    } catch (error) {
       setStatus({ type: "error", message: "Failed to save voice" })
    }
  }

  const handleDeleteVoice = async (voiceId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/voices/${voiceId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete voice")

      setSavedVoices(savedVoices.filter(v => v.id !== voiceId))
      if (selectedVoiceId === voiceId) {
        setSelectedVoiceId(null)
      }
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

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
          // Create URL for audio preview
          const url = URL.createObjectURL(mp3Blob)
          setAudioUrl(url)
          setTrimStart(0)
          setTrimEnd(0)
          setShowTrimControls(false)
          setIsRecording(false)
          setStatus({ type: "success", message: "Audio recorded successfully!" })
        } catch (conversionError) {
          // Fallback: use original blob if conversion fails
          console.log("[v0] MP3 conversion fallback, using original format")
          const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: audioBlob.type })
          setReferenceFile(audioFile)
          setFileName(audioFile.name)
          // Create URL for audio preview
          const url = URL.createObjectURL(audioBlob)
          setAudioUrl(url)
          setTrimStart(0)
          setTrimEnd(0)
          setShowTrimControls(false)
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
      // Create URL for audio preview
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      setTrimStart(0)
      setTrimEnd(0)
      setShowTrimControls(false)
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
      // Create URL for audio preview
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      setTrimStart(0)
      setTrimEnd(0)
      setShowTrimControls(false)
      setStatus({ type: "success", message: "File uploaded successfully!" })
    }
  }

  // Audio player controls
  const togglePlayPause = () => {
    if (!audioPlayerRef.current) return
    
    if (isPlaying) {
      audioPlayerRef.current.pause()
    } else {
      // If trimming, start from trim start
      if (showTrimControls && audioPlayerRef.current.currentTime < trimStart) {
        audioPlayerRef.current.currentTime = trimStart
      }
      audioPlayerRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleAudioLoaded = () => {
    if (audioPlayerRef.current) {
      const duration = audioPlayerRef.current.duration
      setAudioDuration(duration)
      setTrimEnd(duration)
    }
  }

  const handleAudioTimeUpdate = () => {
    if (audioPlayerRef.current) {
      const time = audioPlayerRef.current.currentTime
      setCurrentTime(time)
      // If trimming and past trim end, pause
      if (showTrimControls && time >= trimEnd) {
        audioPlayerRef.current.pause()
        setIsPlaying(false)
      }
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const clearReferenceAudio = () => {
    setReferenceFile(null)
    setFileName("No file selected")
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioDuration(0)
    setCurrentTime(0)
    setTrimStart(0)
    setTrimEnd(0)
    setShowTrimControls(false)
    setIsPlaying(false)
  }

  const applyTrim = async () => {
    if (!referenceFile || !audioUrl) return
    
    try {
      // Load the audio file
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Calculate sample positions
      const startSample = Math.floor(trimStart * audioBuffer.sampleRate)
      const endSample = Math.floor(trimEnd * audioBuffer.sampleRate)
      const trimmedLength = endSample - startSample
      
      // Create new buffer with trimmed audio
      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        trimmedLength,
        audioBuffer.sampleRate
      )
      
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel)
        const destData = trimmedBuffer.getChannelData(channel)
        for (let i = 0; i < trimmedLength; i++) {
          destData[i] = sourceData[startSample + i]
        }
      }
      
      // Convert to WAV
      const wavBuffer = encodeWAV(trimmedBuffer)
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" })
      const trimmedFile = new File([wavBlob], `trimmed_${fileName}`, { type: "audio/wav" })
      
      // Update state
      setReferenceFile(trimmedFile)
      setFileName(trimmedFile.name)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      const newUrl = URL.createObjectURL(wavBlob)
      setAudioUrl(newUrl)
      setAudioDuration(trimmedBuffer.duration)
      setTrimStart(0)
      setTrimEnd(trimmedBuffer.duration)
      setShowTrimControls(false)
      setCurrentTime(0)
      
      setStatus({ type: "success", message: `Audio trimmed to ${(trimEnd - trimStart).toFixed(1)}s` })
    } catch (error) {
      console.error("Trim error:", error)
      setStatus({ type: "error", message: "Failed to trim audio" })
    }
  }

  // Auto-transcribe using Whisper
  const autoTranscribe = async () => {
    if (!referenceFile) {
      setStatus({ type: "error", message: "Please upload or record audio first" })
      return
    }

    setIsTranscribing(true)
    setStatus({ type: "info", message: "Transcribing audio with Whisper..." })

    try {
      const formData = new FormData()
      formData.append("audio_file", referenceFile)

      const response = await fetch("http://localhost:8000/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || "Transcription failed")
      }

      const data = await response.json()
      setReferenceText(data.text)
      setUseManualTranscript(true)
      setStatus({ type: "success", message: `Transcribed: "${data.text.slice(0, 50)}${data.text.length > 50 ? '...' : ''}"` })
    } catch (error) {
      console.error("Transcription error:", error)
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to transcribe audio"
      })
    } finally {
      setIsTranscribing(false)
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

  const handleModelChange = async (newModel: string) => {
      if (newModel === currentModel) return;
      
      setIsSwitchingModel(true);
      try {
          const formData = new FormData();
          formData.append("target_model", newModel);
          
          const response = await fetch("http://localhost:8000/api/model/switch", {
              method: "POST",
              body: formData
          });
          
          if (!response.ok) throw new Error("Failed to switch model");
          
          setCurrentModel(newModel);
          setStatus({ type: "success", message: `Switched to ${newModel} model` });
          setOutputUrl(null);
          
      } catch (error) {
          console.error("Model switch error:", error);
          setStatus({ type: "error", message: "Failed to switch model" });
      } finally {
          setIsSwitchingModel(false);
      }
  };

  const handleGenerateDesign = async (text: string, instruct: string) => {
      const formData = new FormData();
      formData.append("text", text);
      formData.append("instruct", instruct);
      
      try {
          const response = await fetch("http://localhost:8000/api/generate-design", {
              method: "POST",
              body: formData
          });
          if (!response.ok) throw new Error("Failed to generate");
          return await response.blob(); 
      } catch (error) {
          setStatus({ type: "error", message: "Generation failed" });
          return null;
      }
  };

  const handleGeneratePreset = async (text: string, speaker: string) => {
      const formData = new FormData();
      formData.append("text", text);
      formData.append("speaker", speaker);
      
      try {
          const response = await fetch("http://localhost:8000/api/generate-preset", {
              method: "POST",
              body: formData
          });
          if (!response.ok) throw new Error("Failed to generate");
          return await response.blob(); 
      } catch (error) {
          setStatus({ type: "error", message: "Generation failed" });
          return null;
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim()) {
      setStatus({ type: "error", message: "Please enter a text prompt" })
      return
    }

    if (activeTab === "upload" && !referenceFile) {
      setStatus({ type: "error", message: "Please upload or record a reference audio file" })
      return
    }

    if (activeTab === "saved" && !selectedVoiceId) {
      setStatus({ type: "error", message: "Please select a voice from the library" })
      return
    }

    if (!termsAgree) {
      setStatus({ type: "error", message: "Please agree to the terms and conditions" })
      return
    }

    setLoading(true)
    setProgress({ percent: 0, message: "Starting..." })
    setStatus({ type: "info", message: "Generating audio..." })

    try {
      const formData = new FormData()
      formData.append("prompt", prompt)
      formData.append("use_transcript", useManualTranscript.toString())
      formData.append("reference_text", referenceText)
      
      if (activeTab === "upload" && referenceFile) {
        formData.append("audio_file", referenceFile)
      } else if (activeTab === "saved" && selectedVoiceId) {
        formData.append("voice_id", selectedVoiceId)
      }

      // Use streaming endpoint for progress updates
      const response = await fetch("http://localhost:8000/api/generate-stream", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `Generation failed: ${response.statusText}`)
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      if (!reader) {
        throw new Error("Failed to get response stream")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Parse SSE events
        const lines = buffer.split("\n")
        buffer = lines.pop() || "" // Keep incomplete line in buffer

        let eventType = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (eventType === "progress") {
                setProgress({ percent: data.percent, message: data.message })
                setStatus({ type: "info", message: data.message })
              } else if (eventType === "complete") {
                // Decode base64 audio
                const byteChars = atob(data.audio)
                const byteNumbers = new Array(byteChars.length)
                for (let i = 0; i < byteChars.length; i++) {
                  byteNumbers[i] = byteChars.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const audioBlob = new Blob([byteArray], { type: "audio/wav" })
                const url = URL.createObjectURL(audioBlob)
                setOutputUrl(url)
                setProgress({ percent: 100, message: "Done!" })
                setStatus({ type: "success", message: "Audio generated successfully!" })
              } else if (eventType === "error") {
                throw new Error(data.message)
              }
            } catch (parseError) {
              // Continue on parse errors
            }
            eventType = ""
          }
        }
      }
    } catch (error) {
      console.error("Generation error:", error)
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to connect to API. Make sure localhost:8000 is running.",
      })
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }


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
        <ModelSwitcher 
            currentModel={currentModel} 
            onModelChange={handleModelChange} 
            isLoading={isSwitchingModel} 
        />

        {currentModel === "design" && <VoiceDesignPanel onGenerate={handleGenerateDesign} />}
        {currentModel === "custom" && <CustomVoicePanel onGenerate={handleGeneratePreset} />}

        {currentModel === "base" && (
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

              {/* Reference Text Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="useTranscript"
                    checked={useManualTranscript}
                    onCheckedChange={(checked) => setUseManualTranscript(checked as boolean)}
                    disabled={loading}
                  />
                  <label htmlFor="useTranscript" className="text-sm font-medium cursor-pointer">
                    Provide reference text (transcript of reference audio)
                  </label>
                </div>
                {useManualTranscript && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="referenceText" className="text-sm text-muted-foreground">
                        What is being said in the reference audio?
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={autoTranscribe}
                        disabled={!referenceFile || isTranscribing || loading}
                        className="h-7 text-xs gap-1.5"
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Transcribing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Auto-transcribe
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      id="referenceText"
                      value={referenceText}
                      onChange={(e) => setReferenceText(e.target.value)}
                      placeholder="Enter the exact words spoken in the reference audio..."
                      rows={2}
                      className="resize-none bg-input border border-border/50 placeholder:text-muted-foreground/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Providing a transcript improves voice cloning quality. Click "Auto-transcribe" to use Whisper AI.
                    </p>
                  </div>
                )}
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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload & Record</TabsTrigger>
                    <TabsTrigger value="saved">Saved Voices</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4 pt-4">
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

                {/* Audio Player and Controls */}
                {referenceFile && audioUrl && (
                  <div className="space-y-4 p-4 bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20 rounded-lg">
                    {/* Hidden audio element */}
                    <audio
                      ref={audioPlayerRef}
                      src={audioUrl}
                      onLoadedMetadata={handleAudioLoaded}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onEnded={handleAudioEnded}
                      className="hidden"
                    />
                    
                    {/* File info and controls */}
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={togglePlayPause}
                        className="h-10 w-10 rounded-full bg-primary/20 hover:bg-primary/30"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-primary" />
                        ) : (
                          <Play className="w-5 h-5 text-primary ml-0.5" />
                        )}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(audioDuration))}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowTrimControls(!showTrimControls)}
                        className={`h-8 w-8 ${showTrimControls ? 'text-primary bg-primary/20' : 'text-muted-foreground'}`}
                        title="Trim audio"
                      >
                        <Scissors className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearReferenceAudio}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Remove audio"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-6 bg-border mx-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSaveDialogOpen(true)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Save to Library"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      </Button>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                      {/* Trim region indicator */}
                      {showTrimControls && (
                        <div 
                          className="absolute h-full bg-primary/30"
                          style={{ 
                            left: `${(trimStart / audioDuration) * 100}%`,
                            width: `${((trimEnd - trimStart) / audioDuration) * 100}%`
                          }}
                        />
                      )}
                      {/* Current position */}
                      <div 
                        className="absolute h-full bg-primary transition-all duration-100"
                        style={{ width: `${(currentTime / audioDuration) * 100}%` }}
                      />
                    </div>
                    
                    {/* Trim controls */}
                    {showTrimControls && (
                      <div className="space-y-3 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-3">
                          <Label className="text-xs w-12">Start:</Label>
                          <Slider
                            value={[trimStart]}
                            min={0}
                            max={audioDuration}
                            step={0.1}
                            onValueChange={([val]) => setTrimStart(Math.min(val, trimEnd - 0.5))}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {formatTime(Math.floor(trimStart))}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="text-xs w-12">End:</Label>
                          <Slider
                            value={[trimEnd]}
                            min={0}
                            max={audioDuration}
                            step={0.1}
                            onValueChange={([val]) => setTrimEnd(Math.max(val, trimStart + 0.5))}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {formatTime(Math.floor(trimEnd))}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (audioPlayerRef.current) {
                                audioPlayerRef.current.currentTime = trimStart
                                audioPlayerRef.current.play()
                                setIsPlaying(true)
                              }
                            }}
                            className="flex-1 text-xs"
                          >
                            <Play className="w-3 h-3 mr-1" /> Preview Trim
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={applyTrim}
                            className="flex-1 text-xs bg-primary"
                          >
                            <Scissors className="w-3 h-3 mr-1" /> Apply Trim
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Selected: {(trimEnd - trimStart).toFixed(1)}s
                        </p>
                      </div>
                    )}
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
                </TabsContent>

                <TabsContent value="saved" className="pt-4">
                  <VoiceLibrary 
                    voices={savedVoices}
                    selectedVoiceId={selectedVoiceId}
                    onSelect={(voice) => {
                      setSelectedVoiceId(voice.id)
                      if (voice.transcript) {
                        setReferenceText(voice.transcript)
                        setUseManualTranscript(true)
                      }
                    }}
                    onDelete={handleDeleteVoice}
                    isLoading={isLoadingVoices}
                  />
                </TabsContent>
              </Tabs>
              <SaveVoiceDialog
                isOpen={isSaveDialogOpen}
                onOpenChange={setIsSaveDialogOpen}
                onSave={handleSaveVoice}
              />
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

              {/* Progress Bar */}
              {progress && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{progress.message}</span>
                    <span className="font-medium text-primary">{progress.percent}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        )}

        {/* Status Messages */}
        {status && !progress && (
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
