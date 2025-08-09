import { useInputCapabilities } from '@/lib/input-detection'
import { useIsHelpOverlayCollapsed, useHelpOverlayActions } from '@/hooks/useMindMapStore'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function HelpOverlay() {
  const isCollapsed = useIsHelpOverlayCollapsed()
  const { toggleHelpOverlay } = useHelpOverlayActions()
  const capabilities = useInputCapabilities()
  
  const showTouchControls = capabilities.hasTouch
  const showMouseKeyboardControls = capabilities.hasMouse || capabilities.hasKeyboard
  
  return (
    <div 
      className={cn(
        "absolute bottom-4 left-4 bg-gray-900/70 backdrop-blur-md text-white rounded-xl shadow-2xl border border-gray-700/50 z-10 transition-all duration-300",
        isCollapsed ? "max-w-xs" : "max-w-sm"
      )}
    >
      <div 
        className="flex items-center justify-between p-5 pb-0 cursor-pointer hover:bg-gray-800/30 rounded-t-xl transition-colors"
        onClick={toggleHelpOverlay}
        title={isCollapsed ? "Expand help" : "Collapse help"}
      >
        <h2 className="text-lg font-bold select-none">3D Mind Map controls</h2>
        <div className="text-gray-400 hover:text-white transition-colors">
          {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-5 pt-3 space-y-3">
          {/* Camera Controls */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-1">Camera Controls</h3>
            <ul className="text-sm space-y-1 text-gray-200">
              {showMouseKeyboardControls && (
                <>
                  <li>🖱️ Left click + drag: Orbit camera</li>
                  <li>🖱️ Right click + drag: Pan camera</li>
                  <li>🖱️ Scroll wheel: Zoom in/out</li>
                  <li>⌨️ Space: Reset camera position</li>
                </>
              )}
              {showTouchControls && (
                <>
                  <li>📱 One finger drag: Orbit (touch)</li>
                  <li>📱 Two finger drag: Pan (touch)</li>
                  <li>📱 Pinch: Zoom (touch)</li>
                </>
              )}
            </ul>
          </div>
          
          {/* Entry Interactions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-1">Entry Interactions</h3>
            <ul className="text-sm space-y-1 text-gray-200">
              <li>📦 Click entry: Select</li>
              <li>✏️ Click [Edit] on selected: Open editor</li>
              {showMouseKeyboardControls && (
                <>
                  <li>🔄 Drag selected: Move (horizontal)</li>
                  <li>⬆️ Shift + drag: Move depth (in/out)</li>
                  <li>🗑️ Delete key: Delete selected</li>
                  <li>🎯 F: Focus on selected entry</li>
                </>
              )}
              <li>➕ Green button: Create new entry</li>
            </ul>
          </div>
          
          {/* Connection Management */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-1">Connections</h3>
            <ul className="text-sm space-y-1 text-gray-200">
              {showMouseKeyboardControls && (
                <>
                  <li>🔗 Ctrl/Cmd + Click: Toggle connection</li>
                  <li>↩️ Ctrl/Cmd + Z: Undo last action</li>
                  <li>↪️ Ctrl/Cmd + Shift + Z: Redo action</li>
                </>
              )}
            </ul>
          </div>
          
          {/* More Help */}
          {showMouseKeyboardControls && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-1">More</h3>
              <ul className="text-sm space-y-1 text-gray-200">
                <li>❓ Press ? for all keyboard shortcuts</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}