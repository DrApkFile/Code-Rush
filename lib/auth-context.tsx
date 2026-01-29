"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { auth } from "./firebase"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword as firebaseUpdatePassword,
  deleteUser,
} from "firebase/auth"
import { doc, getDoc, setDoc, query, collection, where, getDocs, deleteDoc } from "firebase/firestore"
import { db } from "./firebase"
import { initializeDefaultRatings, type LanguageRatings } from "./rating-system"

interface UserProfile {
  uid: string
  username: string
  username_lower?: string
  email: string
  bio?: string
  profilePicture?: string
  languageRatings: LanguageRatings
  createdAt: number
  updatedAt: number
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
  signup: (username: string, email: string, password: string) => Promise<void>
  login: (emailOrUsername: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>
  checkUsernameExists: (username: string) => Promise<boolean>
  updatePassword: (password: string) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get the ID token and set it as a cookie
          const token = await firebaseUser.getIdToken()
          document.cookie = `auth-token=${token}; path=/`
          
          setUser(firebaseUser)
          // Fetch user profile from Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile)
          }
        } else {
          // Clear the auth token cookie when user is logged out
          document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
          setUser(null)
          setUserProfile(null)
        }
      } catch (err) {
        console.error("[v0] Auth state listener error:", err)
        setError("Failed to load user profile")
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Check if username already exists in Firestore (case-insensitive)
  const checkUsernameExists = async (username: string): Promise<boolean> => {
    try {
      const searchLower = username.toLowerCase()
      
      // Try new schema first (with username_lower)
      let q = query(collection(db, "users"), where("username_lower", "==", searchLower))
      let querySnapshot = await getDocs(q)
      
      // If not found, try old schema (where username is all lowercase)
      if (querySnapshot.empty) {
        q = query(collection(db, "users"), where("username", "==", searchLower))
        querySnapshot = await getDocs(q)
      }
      
      return !querySnapshot.empty
    } catch (err) {
      console.error("[v0] Error checking username:", err)
      return false
    }
  }

  const signup = async (username: string, email: string, password: string): Promise<void> => {
    try {
      setError(null)

      // Validate username format
      if (!username.trim()) {
        throw new Error("Username cannot be empty")
      }
      if (username.includes(" ")) {
        throw new Error("Username cannot contain whitespace")
      }

      // Check if username already exists (case-insensitive)
      const usernameExists = await checkUsernameExists(username)
      if (usernameExists) {
        throw new Error("Username already taken")
      }

      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      const userProfile: UserProfile = {
        uid: firebaseUser.uid,
        username: username, // Keep original case
        username_lower: username.toLowerCase(), // Store lowercase for searching
        email: email.toLowerCase(),
        languageRatings: initializeDefaultRatings(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await setDoc(doc(db, "users", firebaseUser.uid), userProfile)
      setUserProfile(userProfile)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const login = async (emailOrUsername: string, password: string): Promise<void> => {
    try {
      setError(null)
      let email = emailOrUsername

      // If input looks like username (no @), search for it in Firestore (case-insensitive)
      if (!emailOrUsername.includes("@")) {
        const searchLower = emailOrUsername.toLowerCase()
        
        // Try new schema first (with username_lower)
        let q = query(collection(db, "users"), where("username_lower", "==", searchLower))
        let querySnapshot = await getDocs(q)

        // If not found, try old schema (where username is all lowercase)
        if (querySnapshot.empty) {
          q = query(collection(db, "users"), where("username", "==", searchLower))
          querySnapshot = await getDocs(q)
        }

        if (querySnapshot.empty) {
          throw new Error("Username not found")
        }

        email = querySnapshot.docs[0].data().email
      }

      // Sign in with email and password
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      setError(null)
      await signOut(auth)
      setUser(null)
      setUserProfile(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Logout failed"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateUserProfile = async (profileUpdates: Partial<UserProfile>): Promise<void> => {
    if (!user) throw new Error("Not authenticated")

    try {
      setError(null)
      const userDocRef = doc(db, "users", user.uid)
      const updatedData = {
        ...profileUpdates,
        updatedAt: Date.now(),
      }

      await setDoc(userDocRef, updatedData, { merge: true })
      setUserProfile((prev) => (prev ? { ...prev, ...updatedData } : null))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Profile update failed"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updatePassword = async (password: string): Promise<void> => {
    if (!auth.currentUser) throw new Error("Not authenticated")

    try {
      setError(null)
      await firebaseUpdatePassword(auth.currentUser, password)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Password update failed"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const deleteAccount = async (): Promise<void> => {
    if (!auth.currentUser) throw new Error("Not authenticated")

    try {
      setError(null)
      const userDocRef = doc(db, "users", auth.currentUser.uid)
      await deleteDoc(userDocRef)
      await deleteUser(auth.currentUser)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Account deletion failed"
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        signup,
        login,
        logout,
        updateUserProfile,
        checkUsernameExists,
        updatePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
