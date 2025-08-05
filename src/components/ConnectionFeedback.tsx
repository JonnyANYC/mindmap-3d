'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ConnectionFeedbackProps {
  message: string
  onDismiss: () => void
  autoDismissDelay?: number
}

export function ConnectionFeedback({ 
  message, 
  onDismiss, 
  autoDismissDelay = 3000 
}: ConnectionFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onDismiss, 300) // Wait for fade out animation
    }, autoDismissDelay)

    return () => clearTimeout(timer)
  }, [onDismiss, autoDismissDelay])

  if (!isMounted) return null

  return createPortal(
    <div
      className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800/90 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 z-50 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onDismiss, 300)
          }}
          className="text-sm font-medium hover:underline cursor-pointer"
        >
          {message}
        </button>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onDismiss, 300)
          }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  )
}