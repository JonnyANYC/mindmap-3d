import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Entry as EntryType } from '@/types/mindmap'
import { useMindMapStore } from '@/lib/store'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

// Mock the hooks
jest.mock('@/hooks/useMindMapStore', () => ({
  useSelectedEntryId: jest.fn(),
  useHoveredEntryId: jest.fn(),
  useEntryActions: jest.fn(() => ({
    selectEntry: jest.fn(),
    hoverEntry: jest.fn(),
    toggleConnection: jest.fn()
  })),
  useConnectionActions: jest.fn(() => ({
    clearConnectionFeedback: jest.fn()
  }))
}))

// Import after mocking
import { useSelectedEntryId, useHoveredEntryId, useEntryActions, useConnectionActions } from '@/hooks/useMindMapStore'

// Test component that extracts Entry from Scene3D for testing
const TestEntry = ({ 
  entry, 
  onDragStart, 
  onDragEnd, 
  isDragging 
}: {
  entry: EntryType
  onDragStart?: (entryId: string, isShiftKey: boolean) => void
  onDragEnd?: () => void
  isDragging?: boolean
}) => {
  const meshRef = React.useRef<THREE.Mesh>(null!)
  const selectedEntryId = useSelectedEntryId()
  const hoveredEntryId = useHoveredEntryId()
  const { selectEntry, hoverEntry, toggleConnection } = useEntryActions()
  const { clearConnectionFeedback } = useConnectionActions()
  const openEditor = useMindMapStore((state) => state.openEditor)
  
  const isSelected = selectedEntryId === entry.id
  const isHovered = hoveredEntryId === entry.id
  
  const color = isSelected 
    ? '#66BB6A'  // SELECTED_ENTRY_COLOR
    : isHovered 
      ? '#5CAF58'  // HOVERED_ENTRY_COLOR
      : entry.color || '#4CAF50'  // DEFAULT_ENTRY_COLOR

  // Simplified drag handling for testing
  const [pointerDown, setPointerDown] = React.useState(false)
  
  return (
    <group position={entry.position} userData={{ isEntry: true }}>
      <mesh
        ref={meshRef}
        visible={!isDragging}
        onClick={(e) => {
          e.stopPropagation()
          clearConnectionFeedback()
          
          const event = e.nativeEvent as MouseEvent
          if ((event.ctrlKey || event.metaKey) && selectedEntryId && selectedEntryId !== entry.id) {
            toggleConnection(selectedEntryId, entry.id)
          } else {
            selectEntry(entry.id)
          }
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (isSelected) {
            setPointerDown(true)
            if (onDragStart) {
              const event = e.nativeEvent as PointerEvent
              onDragStart(entry.id, event.shiftKey)
            }
          }
        }}
        onPointerUp={() => {
          if (pointerDown) {
            setPointerDown(false)
            if (onDragEnd) {
              onDragEnd()
            }
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!isDragging) {
            hoverEntry(entry.id)
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          if (!isDragging) {
            hoverEntry(null)
          }
        }}
      >
        <boxGeometry args={[1, 1, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Simplified text rendering for testing */}
      <primitive object={new THREE.Object3D()} userData={{ text: entry.summary, position: 'front' }} />
      <primitive object={new THREE.Object3D()} userData={{ text: entry.summary, position: 'back' }} />
      {isSelected && !isDragging && (
        <>
          <primitive object={new THREE.Object3D()} userData={{ text: 'Click and drag to move', position: 'top' }} />
          <primitive 
            object={new THREE.Object3D()} 
            userData={{ text: '[Edit]', position: 'bottom' }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              openEditor(entry.id)
            }}
          />
        </>
      )}
    </group>
  )
}

// Wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Canvas>
    {children}
  </Canvas>
)

describe('Entry Component', () => {
  const mockEntry: EntryType = {
    id: 'test-entry-1',
    position: [0, 0, 0],
    summary: 'Test Entry',
    content: 'Test content',
    color: '#4CAF50',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockSelectEntry = jest.fn()
  const mockHoverEntry = jest.fn()
  const mockToggleConnection = jest.fn()
  const mockClearConnectionFeedback = jest.fn()
  const mockOpenEditor = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mocked hooks
    ;(useSelectedEntryId as jest.Mock).mockReturnValue(null)
    ;(useHoveredEntryId as jest.Mock).mockReturnValue(null)
    ;(useEntryActions as jest.Mock).mockReturnValue({
      selectEntry: mockSelectEntry,
      hoverEntry: mockHoverEntry,
      toggleConnection: mockToggleConnection
    })
    ;(useConnectionActions as jest.Mock).mockReturnValue({
      clearConnectionFeedback: mockClearConnectionFeedback
    })
    
    // Mock Zustand store
    const mockStore = {
      openEditor: mockOpenEditor
    }
    ;(useMindMapStore as unknown as jest.Mock).mockReturnValue(mockStore.openEditor)
  })

  describe('Rendering', () => {
    it('renders with correct dimensions', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const boxGeometry = container.querySelector('boxGeometry')
      expect(boxGeometry).toHaveAttribute('args')
      const args = JSON.parse(boxGeometry!.getAttribute('args')!)
      expect(args).toEqual([1, 1, 0.05])
    })

    it('renders with default color when not selected or hovered', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const material = container.querySelector('meshStandardMaterial')
      expect(material).toHaveAttribute('color', '#4CAF50')
    })

    it('renders with custom color when provided', () => {
      const customEntry = { ...mockEntry, color: '#FF0000' }
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={customEntry} />
        </TestWrapper>
      )
      
      const material = container.querySelector('meshStandardMaterial')
      expect(material).toHaveAttribute('color', '#FF0000')
    })

    it('renders with selected color when selected', () => {
      ;(useSelectedEntryId as jest.Mock).mockReturnValue(mockEntry.id)
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const material = container.querySelector('meshStandardMaterial')
      expect(material).toHaveAttribute('color', '#66BB6A')
    })

    it('renders with hovered color when hovered', () => {
      ;(useHoveredEntryId as jest.Mock).mockReturnValue(mockEntry.id)
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const material = container.querySelector('meshStandardMaterial')
      expect(material).toHaveAttribute('color', '#5CAF58')
    })

    it('renders text on both z-axis surfaces', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const primitives = container.querySelectorAll('primitive')
      const texts = Array.from(primitives).filter(p => 
        p.getAttribute('userData')?.includes('"text":"Test Entry"')
      )
      expect(texts).toHaveLength(2)
      
      const positions = texts.map(t => {
        const userData = JSON.parse(t.getAttribute('userData')!)
        return userData.position
      })
      expect(positions).toContain('front')
      expect(positions).toContain('back')
    })

    it('shows Edit button when selected', () => {
      ;(useSelectedEntryId as jest.Mock).mockReturnValue(mockEntry.id)
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const primitives = container.querySelectorAll('primitive')
      const editButton = Array.from(primitives).find(p => 
        p.getAttribute('userData')?.includes('"text":"[Edit]"')
      )
      expect(editButton).toBeTruthy()
    })

    it('shows move instructions when selected', () => {
      ;(useSelectedEntryId as jest.Mock).mockReturnValue(mockEntry.id)
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const primitives = container.querySelectorAll('primitive')
      const moveText = Array.from(primitives).find(p => 
        p.getAttribute('userData')?.includes('"text":"Click and drag to move"')
      )
      expect(moveText).toBeTruthy()
    })

    it('hides when dragging', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} isDragging={true} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      expect(mesh).toHaveAttribute('visible', 'false')
    })
  })

  describe('Interactions', () => {
    it('selects entry on click', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      fireEvent.click(mesh!)
      
      expect(mockClearConnectionFeedback).toHaveBeenCalled()
      expect(mockSelectEntry).toHaveBeenCalledWith(mockEntry.id)
    })

    it('toggles connection on Ctrl+click when another entry is selected', () => {
      ;(useSelectedEntryId as jest.Mock).mockReturnValue('other-entry-id')
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      fireEvent.click(mesh!, { ctrlKey: true })
      
      expect(mockToggleConnection).toHaveBeenCalledWith('other-entry-id', mockEntry.id)
    })

    it('toggles connection on Cmd+click when another entry is selected', () => {
      ;(useSelectedEntryId as jest.Mock).mockReturnValue('other-entry-id')
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      fireEvent.click(mesh!, { metaKey: true })
      
      expect(mockToggleConnection).toHaveBeenCalledWith('other-entry-id', mockEntry.id)
    })

    it('hovers entry on pointer over', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      fireEvent.pointerOver(mesh!)
      
      expect(mockHoverEntry).toHaveBeenCalledWith(mockEntry.id)
    })

    it('unhovers entry on pointer out', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      fireEvent.pointerOut(mesh!)
      
      expect(mockHoverEntry).toHaveBeenCalledWith(null)
    })

    it('does not hover when dragging', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} isDragging={true} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      fireEvent.pointerOver(mesh!)
      
      expect(mockHoverEntry).not.toHaveBeenCalled()
    })

    it('starts drag on pointer down when selected', () => {
      ;(useSelectedEntryId as jest.Mock).mockReturnValue(mockEntry.id)
      const mockDragStart = jest.fn()
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} onDragStart={mockDragStart} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      fireEvent.pointerDown(mesh!, { shiftKey: false })
      
      expect(mockDragStart).toHaveBeenCalledWith(mockEntry.id, false)
    })

    it('starts shift-drag on pointer down with shift key', () => {
      ;(useSelectedEntryId as jest.Mock).mockReturnValue(mockEntry.id)
      const mockDragStart = jest.fn()
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} onDragStart={mockDragStart} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      fireEvent.pointerDown(mesh!, { shiftKey: true })
      
      expect(mockDragStart).toHaveBeenCalledWith(mockEntry.id, true)
    })

    it('does not start drag when not selected', () => {
      const mockDragStart = jest.fn()
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} onDragStart={mockDragStart} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      fireEvent.pointerDown(mesh!)
      
      expect(mockDragStart).not.toHaveBeenCalled()
    })

    it('opens editor when Edit button is clicked', () => {
      ;(useSelectedEntryId as jest.Mock).mockReturnValue(mockEntry.id)
      
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const primitives = container.querySelectorAll('primitive')
      const editButton = Array.from(primitives).find(p => 
        p.getAttribute('userData')?.includes('"text":"[Edit]"')
      )
      
      fireEvent.click(editButton!)
      
      expect(mockOpenEditor).toHaveBeenCalledWith(mockEntry.id)
    })
  })

  describe('Position', () => {
    it('renders at correct position', () => {
      const customEntry = { ...mockEntry, position: [1, 2, 3] as [number, number, number] }
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={customEntry} />
        </TestWrapper>
      )
      
      const group = container.querySelector('group')
      expect(group).toHaveAttribute('position')
      const position = JSON.parse(group!.getAttribute('position')!)
      expect(position).toEqual([1, 2, 3])
    })
  })

  describe('User Data', () => {
    it('sets isEntry userData on group', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const group = container.querySelector('group')
      expect(group).toHaveAttribute('userData')
      const userData = JSON.parse(group!.getAttribute('userData')!)
      expect(userData.isEntry).toBe(true)
    })
  })

  describe('Event Propagation', () => {
    it('stops propagation on click', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      const event = new MouseEvent('click', { bubbles: true })
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation')
      
      mesh!.dispatchEvent(event)
      
      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    it('stops propagation on pointer events', () => {
      const { container } = render(
        <TestWrapper>
          <TestEntry entry={mockEntry} />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      const events = ['pointerdown', 'pointerover', 'pointerout']
      
      events.forEach(eventType => {
        const event = new PointerEvent(eventType, { bubbles: true })
        const stopPropagationSpy = jest.spyOn(event, 'stopPropagation')
        
        mesh!.dispatchEvent(event)
        
        expect(stopPropagationSpy).toHaveBeenCalled()
      })
    })
  })
})