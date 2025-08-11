'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check initial auth state
    authService.getCurrentUser().then((currentUser) => {
      setUser(currentUser)
      if (!currentUser) {
        router.push('/auth')
      }
      setLoading(false)
    })

    // Subscribe to auth changes
    const authListener = authService.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        router.push('/auth')
      }
    })

    return () => {
      authListener?.data?.subscription.unsubscribe()
    }
  }, [router])

  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-neutral-600 dark:text-neutral-400">
          Loading...
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}