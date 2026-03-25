"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"

export default function SplashScreen() {
    const [progress, setProgress] = useState(0)
    const router = useRouter()

    useEffect(() => {
        // Start progress after a short initial delay for smoother feel
        const startTimeout = setTimeout(() => {
            const timer = setInterval(() => {
                setProgress((prevProgress) => {
                    if (prevProgress >= 100) {
                        clearInterval(timer)
                        return 100
                    }
                    // Faster at first, then slows down for "realistic" loading feel
                    const increment = prevProgress < 30 ? 3 : prevProgress < 70 ? 1.5 : 0.8
                    return Math.min(prevProgress + increment, 100)
                });
            }, 30)
            return () => clearInterval(timer)
        }, 200)

        return () => clearTimeout(startTimeout)
    }, [])

    useEffect(() => {
        if (progress === 100) {
            const timeout = setTimeout(() => {
                router.push("/login")
            }, 600)
            return () => clearTimeout(timeout)
        }
    }, [progress, router])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground selection:bg-primary/30">
            {/* Dynamic Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-[25%] -left-[10%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-[120px] animate-pulse"
                    style={{ animationDuration: '8s' }}
                />
                <div
                    className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-secondary/10 rounded-full blur-[100px] animate-pulse"
                    style={{ animationDuration: '12s', animationDelay: '1s' }}
                />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-[280px] sm:max-w-md px-6 space-y-10">
                {/* Logo Container */}
                <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-foreground/5 to-secondary/20 blur-xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>
                    <h1 className="relative text-5xl sm:text-7xl font-bold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground/90 to-foreground/40 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
                        CodeRush
                    </h1>
                </div>

                {/* Loading Section */}
                <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 ease-out">
                    <div className="relative h-1.5 w-full bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm border border-foreground/5">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-300 ease-out shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center px-0.5">
                        <div className="flex items-center space-x-2">
                            <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
                            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground/80 font-semibold">
                                {progress < 40 ? "Initializing" : progress < 80 ? "Syncing Grid" : "Ready"}
                            </span>
                        </div>
                        <span className="text-[10px] sm:text-xs font-mono text-primary/80 font-bold">
                            {Math.round(progress)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer Branding */}
            <div className="fixed bottom-8 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 font-medium animate-in fade-in duration-1000 delay-700">
                Competitive Programming Reimagined
            </div>
        </div>
    )
}
