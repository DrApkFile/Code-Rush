"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { uploadProfilePicture } from "@/lib/cloudinary"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Upload, X } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function BioSetupPage() {
  const router = useRouter()
  const { userProfile, updateUserProfile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bio, setBio] = useState("")
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.push("/login")
    }
  }, [authLoading, userProfile, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Cloudinary
    handleImageUpload(file)
  }

  const handleImageUpload = async (file: File) => {
    setError(null)
    setUploading(true)

    try {
      const url = await uploadProfilePicture(file)
      setProfilePictureUrl(url)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload image"
      setError(errorMessage)
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setProfilePictureUrl(null)
    setPreviewUrl(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (bio.trim().length > 500) {
      setError("Bio must be 500 characters or less")
      return
    }

    setLoading(true)
    try {
      const updates: Record<string, any> = {}
      if (bio.trim()) updates.bio = bio.trim()
      if (profilePictureUrl) updates.profilePicture = profilePictureUrl

      await updateUserProfile(updates)
      router.push("/dashboard")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update profile"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>Welcome {userProfile?.username}! Tell us about yourself (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <label className="text-sm font-medium">Profile Picture</label>
              <div className="flex flex-col items-center gap-3">
                {previewUrl || profilePictureUrl ? (
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={previewUrl || profilePictureUrl || ""} alt="Profile preview" />
                      <AvatarFallback>{userProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {!uploading && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/50">
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}

                <label htmlFor="profile-pic" className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-transparent"
                    disabled={loading || uploading}
                    onClick={() => document.getElementById("profile-pic")?.click()}
                  >
                    {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {uploading ? "Uploading..." : previewUrl || profilePictureUrl ? "Change Picture" : "Upload Picture"}
                  </Button>
                </label>

                <input
                  id="profile-pic"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={loading || uploading}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">JPG, PNG or GIF (max 5MB)</p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium">
                Bio
              </label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself... (optional)"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading || uploading}
                className="resize-none"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{bio.length}/500</p>
            </div>

            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={loading || uploading}>
                {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading || uploading ? "Saving..." : "Continue to Dashboard"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => router.push("/dashboard")}
                disabled={loading || uploading}
              >
                Skip for Now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
