import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadToken = searchParams.get('uploadToken');
    const fileName = searchParams.get('fileName');
    const contentType = searchParams.get('contentType');
    
    // Validate input
    if (!fileName || !contentType) {
      return NextResponse.json({ error: "fileName and contentType are required" }, { status: 400 })
    }

    if (!uploadToken) {
      return NextResponse.json({ error: "Upload token is required" }, { status: 400 })
    }

    const apiPollUrl = process.env.API_POLL_URL
    if (!apiPollUrl) {
      throw new Error("API_GATEWAY_URL environment variable is not set")
    }

    const url = `https://${apiPollUrl}/poll-ascii-art?uploadToken=${encodeURIComponent(uploadToken)}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to check processing status: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error checking processing status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check processing status" },
      { status: 500 },
    )
  }
}
