import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, fileType } = body

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "fileName and fileType are required" }, { status: 400 })
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "video/mp4"]
    if (!validTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPG, JPEG, and MP4 are supported." },
        { status: 400 },
      )
    }

    const uuid = uuidv4()

    const apiGatewayUrl = process.env.API_GATEWAY_URL
    if (!apiGatewayUrl) {
      throw new Error("API_GATEWAY_URL environment variable is not set")
    }

    const url = `${apiGatewayUrl}/generate-upload-url?uploadToken=${uuid}`
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
      console.error(`API Gateway error: ${response.status} ${errorText}`)
      throw new Error(`Failed to get presigned URL from API Gateway: ${response.status} ${errorText}`)
    }

    const presignedPost = await response.json()
    console.log("Received presigned post data:", JSON.stringify(presignedPost))

    return NextResponse.json({
      presignedPost,
      uploadToken: uuid,
    })
  } catch (error) {
    console.error("Error generating presigned URL:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate presigned URL" },
      { status: 500 },
    )
  }
}
