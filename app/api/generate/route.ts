import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const useTranscript = formData.get("use_transcript") as string
    const referenceText = formData.get("reference_text") as string
    const audioFile = formData.get("audio_file") as File

    if (!prompt || !audioFile) {
      return NextResponse.json({ detail: "Missing required fields" }, { status: 400 })
    }

    // Forward to your FastAPI backend
    const backendFormData = new FormData()
    backendFormData.append("prompt", prompt)
    backendFormData.append("use_transcript", useTranscript || "false")
    backendFormData.append("reference_text", referenceText || "")
    backendFormData.append("audio_file", audioFile)

    const response = await fetch("http://localhost:8000/api/generate", {
      method: "POST",
      body: backendFormData,
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const audioBlob = await response.blob()
    return new NextResponse(audioBlob, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": 'attachment; filename="generated.wav"',
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
