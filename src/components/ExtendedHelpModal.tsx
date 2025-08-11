'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ExtendedHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExtendedHelpModal({ isOpen, onClose }: ExtendedHelpModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      const modal = document.getElementById('extended-help-modal')
      if (modal && !modal.contains(e.target as Node)) {
        onClose()
      }
    }
    
    if (isOpen) {
      // Disable all other keyboard shortcuts
      document.addEventListener('keydown', handleKeyDown, true)
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        id="extended-help-modal"
        className="relative bg-gray-900 text-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close help modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Navigation */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-green-400">Navigation</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-300">Orbit camera</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Left click + drag</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Pan camera</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Right click + drag</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Zoom in/out</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Scroll wheel</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Reset camera position</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Space</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Focus on selected entry</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">F</kbd>
                </li>
              </ul>
            </section>
            
            {/* Entry Management */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Entry Management</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-300">Add new entry</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl/Cmd + A</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Edit selected entry</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl/Cmd + E</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Duplicate selected entry</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl/Cmd + D</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Delete selected entry</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Delete</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Fine-tune position</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Arrow keys</kbd>
                </li>
              </ul>
            </section>
            
            {/* Entry Movement */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Entry Movement</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-300">Move entry (horizontal)</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Drag selected</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Move entry depth (in/out)</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Shift + drag</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Cancel movement</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Esc</kbd>
                </li>
              </ul>
            </section>
            
            {/* Connections */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-orange-400">Connections</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-300">Toggle connection</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl/Cmd + Click</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Undo last action</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl/Cmd + Z</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Redo action</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl/Cmd + Shift + Z</kbd>
                </li>
              </ul>
            </section>
            
            {/* Editor */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-yellow-400">Editor</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-300">Close editor</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Esc</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Save manually</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl/Cmd + S</kbd>
                </li>
              </ul>
            </section>
            
            {/* Help & Debug */}
            <section>
              <h3 className="text-lg font-semibold mb-3 text-cyan-400">Help & Debug</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-300">Show this help modal</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">?</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Close this modal</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Esc</kbd>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Toggle debug display</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Ctrl/Cmd + Shift + D</kbd>
                </li>
              </ul>
            </section>
          </div>
          
          {/* Touch Controls */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold mb-3 text-pink-400">Touch Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-300">Orbit camera</span>
                  <span className="text-gray-400">One finger drag</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Pan camera</span>
                  <span className="text-gray-400">Two finger drag</span>
                </li>
              </ul>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-300">Zoom</span>
                  <span className="text-gray-400">Pinch</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-300">Select entry</span>
                  <span className="text-gray-400">Tap</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}