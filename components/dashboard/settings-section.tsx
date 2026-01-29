"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { uploadProfilePicture } from "@/lib/cloudinary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function SettingsSection() {
  const { userProfile, updateUserProfile, updatePassword, deleteAccount } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState(userProfile?.username || "")
  const [bio, setBio] = useState(userProfile?.bio || "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profilePic, setProfilePic] = useState<File | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfilePic(file)
      try {
        const url = await uploadProfilePicture(file)
        await updateUserProfile({ profilePicture: url })
        setFeedback({ type: 'success', message: "Profile picture updated successfully!" })
      } catch (error) {
        setFeedback({ type: 'error', message: "Failed to upload profile picture." })
      }
    }
  }

  const handleUsernameUpdate = async () => {
    if (username.trim() && username.trim() !== userProfile?.username) {
      try {
        await updateUserProfile({ username: username.trim() })
        setFeedback({ type: 'success', message: "Username updated successfully!" })
      } catch (error) {
        setFeedback({ type: 'error', message: "Failed to update username." })
      }
    }
  }

  const handleBioUpdate = async () => {
    try {
      await updateUserProfile({ bio: bio.trim() })
      setFeedback({ type: 'success', message: "Bio updated successfully!" })
    } catch (error) {
      setFeedback({ type: 'error', message: "Failed to update bio." })
    }
  }

  const handlePasswordUpdate = async () => {
    if (password && password === confirmPassword) {
      try {
        await updatePassword(password)
        setFeedback({ type: 'success', message: "Password updated successfully!" })
        setPassword("")
        setConfirmPassword("")
      } catch (error) {
        setFeedback({ type: 'error', message: "Failed to update password." })
      }
    } else {
      setFeedback({ type: 'error', message: "Passwords do not match." })
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount()
      router.push("/login")
    } catch (error) {
      setFeedback({ type: 'error', message: "Failed to delete account." })
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {feedback && (
        <div className={`p-4 rounded-md ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {feedback.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <img
            src={userProfile?.profilePicture || '/placeholder-user.jpg'}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover"
          />
          <div>
            <Label htmlFor="picture">Update Picture</Label>
            <Input id="picture" type="file" onChange={handleProfilePicChange} className="mt-2" />
            <p className="text-sm text-muted-foreground mt-2">.jpg, .png, .gif, up to 5MB</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={userProfile?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex gap-2">
              <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
              <Button onClick={handleUsernameUpdate}>Save</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <div className="flex gap-2">
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
              <Button onClick={handleBioUpdate}>Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={handlePasswordUpdate}>Change Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Permanently delete your account and all of your content. This action is not reversible.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}