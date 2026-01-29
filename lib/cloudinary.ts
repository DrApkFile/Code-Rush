// Uses Cloudinary unsigned uploads for client-side direct uploads without backend

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

export async function uploadProfilePicture(file: File): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary configuration is missing. Please add environment variables.")
  }

  // Validate file
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image")
  }

  if (file.size > 5 * 1024 * 1024) {
    // 5MB limit
    throw new Error("Image must be smaller than 5MB")
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Upload failed")
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error("[v0] Cloudinary upload error:", error)
    throw new Error("Failed to upload image. Please try again.")
  }
}
