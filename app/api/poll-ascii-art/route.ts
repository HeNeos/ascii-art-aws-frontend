import { type NextRequest, NextResponse } from "next/server"

// TODO: Fix function method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadToken, fileName, fileType } = body
    
    // Validate input
    if (!fileName || !fileType) {
      return NextResponse.json({ error: "fileName and fileType are required" }, { status: 400 })
    }

    if (!uploadToken) {
      return NextResponse.json({ error: "Upload token is required" }, { status: 400 })
    }

    const apiGatewayUrl = process.env.API_GATEWAY_URL
    if (!apiGatewayUrl) {
      throw new Error("API_GATEWAY_URL environment variable is not set")
    }

    const url = `${apiGatewayUrl}/poll-ascii-art?uploadToken=${encodeURIComponent(uploadToken)}`
    console.log(`Checking processing status: ${url}`)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName,
        contentType: fileType,
      }),
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
