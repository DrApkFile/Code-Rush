"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { LayoutDashboard, Target, Users, Trophy, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import DashboardSidebar from "@/components/dashboard/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push("/login")
    }
  }, [user, loading, mounted, router])

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop only */}
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Mobile header */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Target className="h-5 w-5" />
              CodeRush
            </h1>
          </header>

          {/* Page content - with bottom padding on mobile */}
          <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
        </div>
      </div>

      {/* Bottom navigation - Mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card">
        <nav className="flex justify-around p-2">
          <Link href="/dashboard" className={cn(
            "flex flex-col items-center p-2 min-w-[4rem]",
            pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
          )}>
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/dashboard/play" className={cn(
            "flex flex-col items-center p-2 min-w-[4rem]",
            pathname === "/dashboard/play" ? "text-primary" : "text-muted-foreground"
          )}>
            <Target className="h-5 w-5" />
            <span className="text-xs">Play</span>
          </Link>
          <Link href="/dashboard/friends" className={cn(
            "flex flex-col items-center p-2 min-w-[4rem]",
            pathname === "/dashboard/friends" ? "text-primary" : "text-muted-foreground"
          )}>
            <Users className="h-5 w-5" />
            <span className="text-xs">Friends</span>
          </Link>
          <Link href="/dashboard/leaderboard" className={cn(
            "flex flex-col items-center p-2 min-w-[4rem]",
            pathname === "/dashboard/leaderboard" ? "text-primary" : "text-muted-foreground"
          )}>
            <Trophy className="h-5 w-5" />
            <span className="text-xs">Leaders</span>
          </Link>
          <Link href="/dashboard/profile" className={cn(
            "flex flex-col items-center p-2 min-w-[4rem]",
            pathname === "/dashboard/profile" ? "text-primary" : "text-muted-foreground"
          )}>
            <UserCircle className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </Link>
        </nav>
      </div>
    </div>
  )
}
