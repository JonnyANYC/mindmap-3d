import { useEffect, useState } from 'react'

export type InputCapability = 'touch' | 'mouse' | 'keyboard'

interface InputCapabilities {
  hasTouch: boolean
  hasMouse: boolean
  hasKeyboard: boolean
  primary: InputCapability
}

export function detectInputCapabilities(): InputCapabilities {
  // Check for touch capability
  const hasTouch = typeof window !== 'undefined' && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - checking for vendor-prefixed property
    navigator.msMaxTouchPoints > 0
  )
  
  // Check for mouse capability (harder to detect definitively)
  // We'll assume mouse is available unless it's a mobile device with touch
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const hasMouse = !isMobile || (hasTouch && window.matchMedia?.('(pointer: fine)').matches)
  
  // Check for keyboard capability
  // Most devices have keyboards, but we can check if it's a mobile device
  const hasKeyboard = !isMobile || window.matchMedia?.('(hover: hover)').matches
  
  // Determine primary input method
  let primary: InputCapability = 'mouse'
  if (hasTouch && isMobile) {
    primary = 'touch'
  } else if (hasKeyboard && !hasTouch) {
    primary = 'keyboard'
  }
  
  return {
    hasTouch,
    hasMouse,
    hasKeyboard,
    primary
  }
}

export function useInputCapabilities() {
  const [capabilities, setCapabilities] = useState<InputCapabilities>(() => detectInputCapabilities())
  
  useEffect(() => {
    // Re-detect capabilities when window resizes or orientation changes
    const handleChange = () => {
      setCapabilities(detectInputCapabilities())
    }
    
    window.addEventListener('resize', handleChange)
    window.addEventListener('orientationchange', handleChange)
    
    // Also listen for pointer events to detect mouse usage on touch devices
    let mouseDetected = capabilities.hasMouse
    const handleMouseMove = (e: MouseEvent) => {
      // If we detect a real mouse movement (not from touch), update capabilities
      if (!mouseDetected && e.movementX !== 0 && e.movementY !== 0) {
        mouseDetected = true
        setCapabilities(prev => ({ ...prev, hasMouse: true }))
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('resize', handleChange)
      window.removeEventListener('orientationchange', handleChange)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [capabilities.hasMouse])
  
  return capabilities
}