'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService, supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Check if Supabase is configured
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial user
    authService.getCurrentUser().then(user => {
      setUser(user)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Subscribe to auth changes
    const authListener = authService.onAuthStateChange((event, session) => {
      setUser((session as any)?.user ?? null)
    })

    return () => {
      authListener?.data?.subscription?.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const result = await authService.signOut()
    
    if (result.success) {
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out',
      })
      router.push('/')
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to sign out',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-neutral-500 dark:text-neutral-400">
        Loading...
      </div>
    )
  }

  if (!user) {
    // If Supabase is not configured, don't show sign in button
    if (!supabase) {
      return null
    }
    
    return (
      <Button
        onClick={() => router.push('/auth')}
        variant="outline"
        size="sm"
        className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-950"
      >
        Sign In
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">
        {user.email}
      </span>
      <Button
        onClick={handleSignOut}
        variant="outline"
        size="sm"
        className="text-neutral-600 border-neutral-300 hover:bg-neutral-100 dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Sign Out
      </Button>
    </div>
  )
}