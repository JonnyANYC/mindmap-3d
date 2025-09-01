'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Cylinder as DreiCylinder } from '@react-three/drei'
import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { Mesh, Vector3, Camera } from 'three'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { 
  useEntries, 
  useConnections, 
  useSelectedEntryId,
  useHoveredEntryId,
  useEntryActions,
  useConnectionFeedback,
  useConnectionActions,
  useSelectedEntry
} from '@/hooks/useMindMapStore'
import { DEFAULT_ENTRY_COLOR, SELECTED_ENTRY_COLOR, HOVERED_ENTRY_COLOR } from '@/types/mindmap'
import type { Entry as EntryType, Connection as ConnectionType, Position3D } from '@/types/mindmap'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ConnectionFeedback } from '@/components/ConnectionFeedback'
import { useToast } from '@/hooks/use-toast'
import { useMindMapStore } from '@/lib/store'
import { ExtendedHelpModal } from '@/components/ExtendedHelpModal'
import { HelpOverlay } from '@/components/HelpOverlay'
import { PerformanceMonitor } from '@/components/PerformanceMonitor'
import { DebugDisplay } from '@/components/DebugDisplay'
import { RearrangementAnimator } from '@/components/RearrangementAnimator'
import { getDisplayTitle } from '@/lib/utils/title'

interface EntryProps {
  entry: EntryType
  onDragStart?: (entryId: string, isShiftKey: boolean) => void
  onDragEnd?: () => void
  isDragging?: boolean
  entryRef: React.Ref<THREE.Group>
}



interface GhostEntryProps {
  position: Position3D
  opacity: number
  color: string
  title: string
  hideBackText?: boolean
}

function GhostEntry({ position, opacity, color, title, isFacingCamera, hideBackText = false }: GhostEntryProps) {
  const { displayTitle, fontSize } = getDisplayTitle(title || 'New Entry')
  
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1, 1, 0.05]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <Text
        visible={!hideBackText || isFacingCamera}
        position={[0, 0, 0.026]}
        fontSize={fontSize}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
        material-opacity={opacity}
        material-transparent
      >
        {displayTitle}
      </Text>
      <Text
        visible={!hideBackText || !isFacingCamera}
        position={[0, 0, -0.026]}
        fontSize={fontSize}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
        rotation={[0, Math.PI, 0]}
        material-opacity={opacity}
        material-transparent
      >
        {displayTitle}
      </Text>
    </group>
  )
}

function Entry({ entry, onDragStart, onDragEnd, isDragging, entryRef, isFacingCamera, lodLevel }: EntryProps) {
  const meshRef = useRef<Mesh>(null!)
  const selectedEntryId = useSelectedEntryId()
  const { selectEntry, hoverEntry, toggleConnection } = useEntryActions()
  const { clearConnectionFeedback } = useConnectionActions()
  const openEditor = useMindMapStore((state) => state.openEditor)
  
  const isSelected = useSelectedEntryId() === entry.id
  const isHovered = useHoveredEntryId() === entry.id
  const rootEntryId = useMindMapStore((state) => state.rootEntryId)
  const isRoot = entry.id === rootEntryId
  
  // Get display title and font size
  const { displayTitle, fontSize } = getDisplayTitle(entry.title || entry.summary || 'New Entry')
  
  const color = isRoot
    ? '#007bff' // Blue color for root entry
    : isSelected 
      ? SELECTED_ENTRY_COLOR 
      : isHovered 
        ? HOVERED_ENTRY_COLOR 
        : entry.color || DEFAULT_ENTRY_COLOR
  
  // Drag detection state
  const [dragStartPos, setDragStartPos] = useState<[number, number] | null>(null)
  const [pointerDown, setPointerDown] = useState(false)
  const dragThreshold = 5 // pixels
  
  // Handle global pointer events for drag
  useEffect(() => {
    if (!pointerDown && !isDragging) return
    
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (pointerDown && dragStartPos && !isDragging) {
        const deltaX = e.clientX - dragStartPos[0]
        const deltaY = e.clientY - dragStartPos[1]
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
        // Check if we've moved past the drag threshold
        if (distance > dragThreshold) {
          // Start dragging
          if (onDragStart) {
            onDragStart(entry.id, e.shiftKey)
          }
          setPointerDown(false)
          setDragStartPos(null)
        }
      }
    }
    
    const handleGlobalPointerUp = () => {
      if (pointerDown) {
        setPointerDown(false)
        setDragStartPos(null)
      }
      if (isDragging && onDragEnd) {
        onDragEnd()
      }
    }
    
    window.addEventListener('pointermove', handleGlobalPointerMove)
    window.addEventListener('pointerup', handleGlobalPointerUp)
    window.addEventListener('pointercancel', handleGlobalPointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove)
      window.removeEventListener('pointerup', handleGlobalPointerUp)
      window.removeEventListener('pointercancel', handleGlobalPointerUp)
    }
  }, [pointerDown, isDragging, dragStartPos, onDragStart, onDragEnd, entry.id])

  return (
    <group ref={entryRef} position={entry.position} userData={{ isEntry: true }}>
      <mesh
        visible={!isDragging}
        ref={meshRef}
        frustumCulled={true}
        onClick={(e) => {
          e.stopPropagation()
          
          // Only process click if not dragging
          if (!isDragging && !pointerDown) {
            // Clear feedback on any entry click
            clearConnectionFeedback()
            
            // Check if Ctrl or Cmd is pressed
            const event = e.nativeEvent as MouseEvent
            if ((event.ctrlKey || event.metaKey) && selectedEntryId && selectedEntryId !== entry.id) {
              // Ctrl+Click: Toggle connection with selected entry
              toggleConnection(selectedEntryId, entry.id)
            } else {
              // Normal click: Select entry
              selectEntry(entry.id)
            }
          }
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          
          // Only allow dragging if this entry is selected
          if (isSelected) {
            setPointerDown(true)
            const event = e.nativeEvent as PointerEvent
            setDragStartPos([event.clientX, event.clientY])
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
      <Text
        visible={(!isDragging || isFacingCamera) && lodLevel === 'near'}
        position={[0, 0, 0.026]}
        fontSize={fontSize}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
        frustumCulled={true}
        // @ts-expect-error - pointerEvents prop exists but not in types
        pointerEvents="none"
      >
        {displayTitle}
      </Text>
      <Text
        visible={(!isDragging || !isFacingCamera) && lodLevel === 'near'}
        position={[0, 0, -0.026]}
        fontSize={fontSize}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
        rotation={[0, Math.PI, 0]}
        frustumCulled={true}
        // @ts-expect-error - pointerEvents prop exists but not in types
        pointerEvents="none"
      >
        {displayTitle}
      </Text>
      {isSelected && !isDragging && lodLevel === 'near' && (
        <>
          <Text
            position={[0, 0.45, 0.026]}
            fontSize={0.06}
            color="white"
            anchorX="center"
            anchorY="middle"
            frustumCulled={true}
          >
            Click and drag to move
          </Text>
          <Text
            position={[0, -0.35, 0.026]}
            fontSize={0.08}
            color="white"
            anchorX="center"
            anchorY="middle"
            frustumCulled={true}
            onClick={(e) => {
              e.stopPropagation()
              openEditor(entry.id)
            }}
          >
            [Edit]
          </Text>
          <Text
            position={[0, -0.35, -0.026]}
            fontSize={0.08}
            color="white"
            anchorX="center"
            anchorY="middle"
            rotation={[0, Math.PI, 0]}
            frustumCulled={true}
            onClick={(e) => {
              e.stopPropagation()
              openEditor(entry.id)
            }}
          >
            [Edit]
          </Text>
        </>
      )}
    </group>
  )
}

interface ConnectionProps {
  connection: ConnectionType
  sourceEntry: EntryType
  targetEntry: EntryType
}

function Connection({ sourceEntry, targetEntry, opacity }: ConnectionProps) {
  const meshRef = useRef<Mesh>(null!)
  const [isVisible] = useState(true)
  
  // Calculate connection geometry with smart surface selection
  const { position, rotation, length } = useMemo(() => {
    const startVec = new Vector3(...sourceEntry.position)
    const endVec = new Vector3(...targetEntry.position)
    
    // Calculate entry dimensions
    const entryWidth = 1
    const entryHeight = 1
    const entryDepth = 0.05
    
    // Calculate vector from source to target
    const connectionVector = endVec.clone().sub(startVec)
    const direction = connectionVector.normalize()
    
    // Determine which surfaces to connect based on the dominant axis
    const sourceOffset = new Vector3()
    const targetOffset = new Vector3()
    
    // Check the dominant direction component
    const absX = Math.abs(direction.x)
    const absY = Math.abs(direction.y)
    const absZ = Math.abs(direction.z)
    
    if (absZ >= absX && absZ >= absY) {
      // Z-axis is dominant - connect z-surfaces
      sourceOffset.z = direction.z > 0 ? entryDepth / 2 : -entryDepth / 2
      targetOffset.z = direction.z > 0 ? -entryDepth / 2 : entryDepth / 2
    } else if (absX >= absY) {
      // X-axis is dominant - connect x-surfaces
      sourceOffset.x = direction.x > 0 ? entryWidth / 2 : -entryWidth / 2
      targetOffset.x = direction.x > 0 ? -entryWidth / 2 : entryWidth / 2
    } else {
      // Y-axis is dominant - connect y-surfaces
      sourceOffset.y = direction.y > 0 ? entryHeight / 2 : -entryHeight / 2
      targetOffset.y = direction.y > 0 ? -entryHeight / 2 : entryHeight / 2
    }
    
    // Calculate the actual connection points on the entry surfaces
    const sourcePoint = startVec.clone().add(sourceOffset)
    const targetPoint = endVec.clone().add(targetOffset)
    
    // Recalculate direction based on actual connection points
    const actualDirection = targetPoint.clone().sub(sourcePoint).normalize()
    
    // Apply 0.5 unit gap from entry surfaces
    const gap = 0.5
    const connectionStart = sourcePoint.clone().add(actualDirection.clone().multiplyScalar(gap))
    const connectionEnd = targetPoint.clone().sub(actualDirection.clone().multiplyScalar(gap))
    
    // Calculate cylinder position (midpoint) and length
    const midpoint = connectionStart.clone().add(connectionEnd).multiplyScalar(0.5)
    const cylinderLength = connectionStart.distanceTo(connectionEnd)
    
    // Calculate rotation to align cylinder with connection direction
    const up = new Vector3(0, 1, 0)
    const axis = new Vector3().crossVectors(up, actualDirection).normalize()
    const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(actualDirection))))
    
    return {
      position: [midpoint.x, midpoint.y, midpoint.z] as [number, number, number],
      rotation: [axis.x * angle, axis.y * angle, axis.z * angle] as [number, number, number],
      length: cylinderLength
    }
  }, [sourceEntry.position, targetEntry.position])
  
  return (
    <DreiCylinder
      ref={meshRef}
      visible={isVisible}
      args={[0.01, 0.01, length, 8]}
      position={position}
      rotation={rotation}
      frustumCulled={true}
    >
      <meshStandardMaterial 
        color={DEFAULT_ENTRY_COLOR}
        transparent 
        opacity={opacity}
      />
    </DreiCylinder>
  )
}



function DragController({
  dragState,
  setDragState
}: {
  dragState: {
    isDragging: boolean
    entryId: string | null
    isShiftDrag: boolean
    originalPosition: Position3D | null
    previewPosition: Position3D | null
    startPoint: Vector3 | null
  }
  setDragState: React.Dispatch<React.SetStateAction<{
    isDragging: boolean
    entryId: string | null
    isShiftDrag: boolean
    originalPosition: Position3D | null
    previewPosition: Position3D | null
    startPoint: Vector3 | null
  }>>
}) {
  const { camera, raycaster, pointer } = useThree()
  const planeRef = useRef<THREE.Plane | null>(null)
  const intersectionPointRef = useRef(new Vector3())
  const dragOffsetRef = useRef(new Vector3())
  
  useEffect(() => {
    if (dragState.isDragging && dragState.startPoint) {
      // Create a plane perpendicular to the camera view at the entry position
      const cameraDirection = new Vector3()
      camera.getWorldDirection(cameraDirection)
      
      // Create the plane normal (perpendicular to camera direction)
      planeRef.current = new THREE.Plane(cameraDirection, -cameraDirection.dot(dragState.startPoint))
      
      // Calculate initial intersection to get drag offset
      raycaster.setFromCamera(pointer, camera)
      if (planeRef.current) {
        raycaster.ray.intersectPlane(planeRef.current, intersectionPointRef.current)
        dragOffsetRef.current.subVectors(dragState.startPoint, intersectionPointRef.current)
      }
    }
  }, [dragState.isDragging, dragState.startPoint, camera, pointer, raycaster])
  
  useFrame(() => {
    if (!dragState.isDragging || !dragState.entryId || !planeRef.current) return
    
    if (dragState.isShiftDrag) {
      // Depth movement (Shift+drag)
      const entry = dragState.startPoint
      if (!entry) return
      
      // Use vertical mouse movement for depth
      const depthDelta = -pointer.y * 2 // Negative for intuitive movement
      const cameraDirection = new Vector3()
      camera.getWorldDirection(cameraDirection)
      
      // Calculate new position along camera direction
      const newPosition = entry.clone().add(cameraDirection.multiplyScalar(depthDelta))
      
      // Clamp distance from camera
      const distanceFromCamera = camera.position.distanceTo(newPosition)
      if (distanceFromCamera >= 1 && distanceFromCamera <= 100) {
        setDragState(prev => ({
          ...prev,
          previewPosition: [newPosition.x, newPosition.y, newPosition.z]
        }))
      }
    } else {
      // Perpendicular plane movement (normal drag)
      raycaster.setFromCamera(pointer, camera)
      
      // Intersect with the drag plane
      if (raycaster.ray.intersectPlane(planeRef.current, intersectionPointRef.current)) {
        // Apply the offset to maintain relative position to cursor
        const newPosition = intersectionPointRef.current.clone().add(dragOffsetRef.current)
        
        // Reduced movement speed (1/3 of normal)
        const dampedPosition = dragState.startPoint!.clone().lerp(newPosition, 0.33)
        
        setDragState(prev => ({
          ...prev,
          previewPosition: [dampedPosition.x, dampedPosition.y, dampedPosition.z]
        }))
      }
    }
  })
  
  return null
}

function FrameProcessor({ setEntryRenderInfo, setConnectionOpacities }) {
  const { camera, scene } = useThree();
  const entries = useEntries();
  const connections = useConnections();
  const entryRenderInfoRef = useRef(new Map());
  const connectionOpacitiesRef = useRef(new Map());

  useFrame(() => {
    const newEntryRenderInfo = new Map<string, { isFacingCamera: boolean; lodLevel: 'near' | 'far' }>();
    const newConnectionOpacities = new Map<string, number>();
    const cameraPosition = camera.position;
    const FAR_THRESHOLD = 15;

    let entryInfoChanged = false;
    entries.forEach(entry => {
      const entryPos = new Vector3(...entry.position);
      const distance = cameraPosition.distanceTo(entryPos);
      const cameraToEntry = entryPos.clone().sub(cameraPosition);
      const dotProduct = cameraToEntry.dot(new Vector3(0, 0, 1));
      const isFacingCamera = dotProduct < 0;
      const lodLevel = distance > FAR_THRESHOLD ? 'far' : 'near';
      newEntryRenderInfo.set(entry.id, { isFacingCamera, lodLevel });

      const oldInfo = entryRenderInfoRef.current.get(entry.id);
      if (!oldInfo || oldInfo.isFacingCamera !== isFacingCamera || oldInfo.lodLevel !== lodLevel) {
        entryInfoChanged = true;
      }
    });

    if (entryInfoChanged || newEntryRenderInfo.size !== entryRenderInfoRef.current.size) {
      setEntryRenderInfo(newEntryRenderInfo);
      entryRenderInfoRef.current = newEntryRenderInfo;
    }

    const raycaster = new THREE.Raycaster();
    let connectionOpacitiesChanged = false;
    connections.forEach(connection => {
      const sourceEntry = entries.find(e => e.id === connection.sourceId)
      const targetEntry = entries.find(e => e.id === connection.targetId)
      if (!sourceEntry || !targetEntry) return;

      const start = new Vector3(...sourceEntry.position);
      const end = new Vector3(...targetEntry.position);
      const midPoint = new Vector3().addVectors(start, end).multiplyScalar(0.5);
      const direction = new Vector3().subVectors(midPoint, camera.position).normalize();
      raycaster.set(camera.position, direction);
      const intersects = raycaster.intersectObjects(scene.children, true);

      let occluded = false;
      if (intersects.length > 0) {
        const intersection = intersects[0];
        const distanceToIntersection = intersection.distance;
        const distanceToMidpoint = camera.position.distanceTo(midPoint);
        if (distanceToIntersection < distanceToMidpoint) {
          occluded = true;
        }
      }

      const newOpacity = occluded ? 0.25 : 1;
      newConnectionOpacities.set(connection.id, newOpacity);

      if (connectionOpacitiesRef.current.get(connection.id) !== newOpacity) {
        connectionOpacitiesChanged = true;
      }
    });

    if (connectionOpacitiesChanged || newConnectionOpacities.size !== connectionOpacitiesRef.current.size) {
      setConnectionOpacities(newConnectionOpacities);
      connectionOpacitiesRef.current = newConnectionOpacities;
    }
  });

  return null;
}

export default function Scene3D() {
  const entries = useEntries()
  const connections = useConnections()
  const { selectEntry, addEntry, moveEntry, deleteEntry } = useEntryActions()
  const selectedEntryId = useSelectedEntryId()
  const selectedEntry = useSelectedEntry()
  const connectionFeedback = useConnectionFeedback()
  const { undoConnection, redoConnection, clearConnectionFeedback } = useConnectionActions()
  const cameraRef = useRef<Camera | null>(null)
  const orbitControlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [showExtendedHelp, setShowExtendedHelp] = useState(false)
  const isInputFocused = useMindMapStore(state => state.isInputFocused)
  const [showDevTools, setShowDevTools] = useState(false)
  const entryRefs = useRef(new Map<string, THREE.Group | null>());
  const [entryRenderInfo, setEntryRenderInfo] = useState<Map<string, { isFacingCamera: boolean; lodLevel: 'near' | 'far' }>>(new Map());
  const [connectionOpacities, setConnectionOpacities] = useState<Map<string, number>>(new Map());
  
  // Drag state
  const [dragState, setDragState] = useState<{
    isDragging: boolean
    entryId: string | null
    isShiftDrag: boolean
    originalPosition: Position3D | null
    previewPosition: Position3D | null
    startPoint: Vector3 | null
  }>({
    isDragging: false,
    entryId: null,
    isShiftDrag: false,
    originalPosition: null,
    previewPosition: null,
    startPoint: null
  })
  
  // Drag handlers
  const handleDragStart = (entryId: string, isShiftKey: boolean) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return
    
    setDragState({
      isDragging: true,
      entryId,
      isShiftDrag: isShiftKey,
      originalPosition: [...entry.position],
      previewPosition: [...entry.position],
      startPoint: new Vector3(...entry.position)
    })
    
    // Disable orbit controls during drag
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = false
    }
  }
  
  const handleDragEnd = useCallback(() => {
    // Commit the move if we have a preview position
    if (dragState.isDragging && dragState.entryId && dragState.previewPosition) {
      moveEntry(dragState.entryId, dragState.previewPosition)
    }
    
    setDragState({
      isDragging: false,
      entryId: null,
      isShiftDrag: false,
      originalPosition: null,
      previewPosition: null,
      startPoint: null
    })
    
    // Re-enable orbit controls
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = true
    }
  }, [dragState, moveEntry])

  const handleAddEntry = useCallback(() => {
    if (!cameraRef.current) {
      // Fallback to random position if camera not ready
      const newEntry = addEntry()
      // Auto-open editor for new entry
      if (newEntry) {
        useMindMapStore.getState().openEditor(newEntry.id, true)
      }
      return
    }
    
    const camera = cameraRef.current
    const selectedEntry = entries.find(e => e.id === selectedEntryId)
    
    let newPosition: [number, number, number]
    
    if (selectedEntry) {
      // Calculate distance between camera and selected entry
      const cameraPos = new Vector3(camera.position.x, camera.position.y, camera.position.z)
      const entryPos = new Vector3(...selectedEntry.position)
      const distance = cameraPos.distanceTo(entryPos)
      
      if (distance > 3) {
        // Place halfway between camera and selected entry
        const midpoint = new Vector3()
          .addVectors(cameraPos, entryPos)
          .multiplyScalar(0.5)
        newPosition = [midpoint.x, midpoint.y, midpoint.z]
      } else {
        // Place 3 units in front of camera
        const direction = new Vector3(0, 0, -1)
        direction.applyQuaternion(camera.quaternion)
        const position = cameraPos.clone().add(direction.multiplyScalar(3))
        newPosition = [position.x, position.y, position.z]
      }
    } else {
      // No selection - place 3 units in front of camera
      const cameraPos = new Vector3(camera.position.x, camera.position.y, camera.position.z)
      const direction = new Vector3(0, 0, -1)
      direction.applyQuaternion(camera.quaternion)
      const position = cameraPos.clone().add(direction.multiplyScalar(3))
      newPosition = [position.x, position.y, position.z]
    }
    
    const newEntry = addEntry(newPosition)
    // Auto-open editor for new entry
    if (newEntry) {
      useMindMapStore.getState().openEditor(newEntry.id, true)
    }
  }, [addEntry, entries, selectedEntryId])

  // Handle keyboard shortcuts for undo/redo, ESC cancellation, and Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused) return
      // Don't handle shortcuts when editor is open
      const isEditorOpen = useMindMapStore.getState().isEditorOpen
      if (isEditorOpen && e.key !== 'Escape') return
      
      // Don't handle shortcuts when extended help modal is open (except ESC and ?)
      if (showExtendedHelp && e.key !== 'Escape' && e.key !== '?' && !(e.key === '/' && e.shiftKey)) return
      
      // Check for ESC key during drag
      if (e.key === 'Escape' && dragState.isDragging) {
        e.preventDefault()
        
        // Cancel drag without committing the move
        setDragState({
          isDragging: false,
          entryId: null,
          isShiftDrag: false,
          originalPosition: null,
          previewPosition: null,
          startPoint: null
        })
        
        // Re-enable orbit controls
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = true
        }
      }
      // Check for Delete key when an entry is selected
      else if (e.key === 'Delete' && selectedEntryId) {
        e.preventDefault()
        const entryToDelete = entries.find(e => e.id === selectedEntryId)
        if (entryToDelete) {
          // Store the ID and title before deletion
          const deletedId = entryToDelete.id
          const deletedTitle = entryToDelete.title || entryToDelete.summary
          
          deleteEntry(selectedEntryId)
          
          // Show toast with undo option
          toast({
            title: "Entry deleted",
            description: '"' + deletedTitle + '" has been deleted.',
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Get the latest deleted entries from the store
                  const currentDeletedEntries = useMindMapStore.getState().deletedEntries
                  const deletedEntry = currentDeletedEntries.find(de => de.entry.id === deletedId)
                  if (deletedEntry) {
                    useMindMapStore.getState().restoreDeletedEntry(deletedEntry)
                    toast({
                      title: "Entry restored",
                      description: '"' + deletedSummary + '" has been restored.',
                    })
                  }
                }}
              >
                Undo
              </Button>
            ),
            duration: 30000, // 30 seconds to undo
          })
        }
      }
      // Check for Ctrl/Cmd + Z (undo)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        
        // Try to undo rearrangement first, then fall back to connection undo
        const didUndoRearrangement = useMindMapStore.getState().undoRearrangement()
        if (didUndoRearrangement) {
          toast({
            title: "Rearrangement Undone",
            description: "The mind map has been restored to its previous state.",
            duration: 3000,
          })
        } else {
          undoConnection()
        }
      }
      // Check for Ctrl/Cmd + Shift + Z (redo)
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        redoConnection()
      }
      // Check for Ctrl/Cmd + A (add new entry)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        handleAddEntry()
      }
      // Check for Ctrl/Cmd + E (edit selected entry)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'e' && selectedEntryId) {
        e.preventDefault()
        useMindMapStore.getState().openEditor(selectedEntryId)
      }
      // Check for Ctrl/Cmd + D (duplicate selected entry)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedEntryId) {
        e.preventDefault()
        const entryToDuplicate = entries.find(e => e.id === selectedEntryId)
        if (entryToDuplicate) {
          // Create a new entry with the same content but offset position
          const offset = 1.5
          const newPosition: Position3D = [
            entryToDuplicate.position[0] + offset,
            entryToDuplicate.position[1],
            entryToDuplicate.position[2] + offset
          ]
          const newEntry = addEntry(newPosition)
          useMindMapStore.getState().updateEntry(newEntry.id, {
            title: entryToDuplicate.title || entryToDuplicate.summary,
            content: entryToDuplicate.content,
            color: entryToDuplicate.color
          })
          
          toast({
            title: "Entry duplicated",
            description: '"' + (entryToDuplicate.title || entryToDuplicate.summary) + '" has been duplicated.',
          })
        }
      }
      // Check for Space key (reset camera)
      else if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault()
        if (orbitControlsRef.current) {
          // Reset camera to default position
          orbitControlsRef.current.reset()
          toast({
            title: "Camera reset",
            description: "Camera position has been reset to default.",
            duration: 2000,
          })
        }
      }
      // Check for F key (focus on selected entry)
      else if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.shiftKey && selectedEntryId) {
        e.preventDefault()
        const selectedEntry = entries.find(e => e.id === selectedEntryId)
        if (selectedEntry && orbitControlsRef.current) {
          // Animate camera to focus on selected entry
          const targetPosition = new Vector3(...selectedEntry.position)
          orbitControlsRef.current.target.copy(targetPosition)
          orbitControlsRef.current.update()
          
          // Move camera to a good viewing position relative to the entry
          // Distance reduced by 1/3 (from 5 to 3.33) for closer view
          const distance = 3.33
          const cameraPosition = targetPosition.clone().add(new Vector3(distance, distance, distance))
          cameraRef.current?.position.copy(cameraPosition)
          cameraRef.current?.lookAt(targetPosition)
          
          const entryTitle = ('title' in selectedEntry ? selectedEntry.title : null) || selectedEntry.summary
          const description = 'Camera focused on "' + entryTitle + '".'
          toast({
            title: "Focused on entry",
            description: description,
            duration: 2000,
          })
        }
      }
      // Check for Arrow keys (fine-tune position of selected entry)
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedEntryId && !dragState.isDragging) {
        e.preventDefault()
        const selectedEntry = entries.find(e => e.id === selectedEntryId)
        if (selectedEntry) {
          const moveDistance = 0.1
          const newPosition: Position3D = [...selectedEntry.position]
          
          // Get camera direction for relative movement
          const cameraDirection = new Vector3()
          cameraRef.current?.getWorldDirection(cameraDirection)
          cameraDirection.y = 0 // Project onto horizontal plane
          cameraDirection.normalize()
          
          // Calculate right vector (perpendicular to camera direction)
          const rightVector = new Vector3()
          rightVector.crossVectors(cameraDirection, new Vector3(0, 1, 0)).normalize()
          
          switch (e.key) {
            case 'ArrowUp':
              // Move forward relative to camera
              newPosition[0] += cameraDirection.x * moveDistance
              newPosition[2] += cameraDirection.z * moveDistance
              break
            case 'ArrowDown':
              // Move backward relative to camera
              newPosition[0] -= cameraDirection.x * moveDistance
              newPosition[2] -= cameraDirection.z * moveDistance
              break
            case 'ArrowLeft':
              // Move left relative to camera
              newPosition[0] -= rightVector.x * moveDistance
              newPosition[2] -= rightVector.z * moveDistance
              break
            case 'ArrowRight':
              // Move right relative to camera
              newPosition[0] += rightVector.x * moveDistance
              newPosition[2] += rightVector.z * moveDistance
              break
          }
          
          moveEntry(selectedEntryId, newPosition)
        }
      }
      // Check for ? key (toggle extended help modal)
      else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        setShowExtendedHelp(prev => !prev)
      }
      // Check for Ctrl/Cmd + Shift + D (toggle dev tools)
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        setShowDevTools(prev => !prev)
      }
      // Check for Ctrl+Shift+R (rearrange mind map)  
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        const startTime = Date.now()
        const { dismiss } = toast({
          title: "Rearranging Mind Map",
          description: "Please wait...",
        })
        useMindMapStore.getState().rearrangeMindMap(() => {
          dismiss()
          const duration = ((Date.now() - startTime) / 1000).toFixed(1)
          toast({
            title: "Rearrangement Complete",
            description: 'Completed in ' + duration + 's. Press Ctrl+Z to undo.',
            duration: 5000,
          })
        })
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoConnection, redoConnection, dragState, moveEntry, handleDragEnd, selectedEntryId, deleteEntry, entries, toast, handleAddEntry, addEntry, setShowExtendedHelp, showExtendedHelp, setShowDevTools, isInputFocused])

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900 relative" tabIndex={0}>
      <Canvas 
        onPointerMissed={() => {
          // Only deselect when clicking on empty space
          selectEntry(null)
        }}
        gl={{ antialias: true }}
        camera={{ fov: 75 }}
      >
        <FrameProcessor 
          setEntryRenderInfo={setEntryRenderInfo}
          setConnectionOpacities={setConnectionOpacities}
        />
        <DragController
          dragState={dragState}
          setDragState={setDragState}
        />
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 10, 50]} />
        
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        <OrbitControls 
          ref={orbitControlsRef}
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true} 
          onChange={clearConnectionFeedback}
        />
        
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <pointLight position={[0, 5, 0]} intensity={0.3} />
        
        {/* Render all entries */}
        {entries.map(entry => {
          const renderInfo = entryRenderInfo.get(entry.id) || { isFacingCamera: true, lodLevel: 'near' };
          return (
            <Entry 
              key={entry.id} 
              entry={entry}
              entryRef={el => entryRefs.current.set(entry.id, el)}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              isDragging={dragState.isDragging && dragState.entryId === entry.id}
              isFacingCamera={renderInfo.isFacingCamera}
              lodLevel={renderInfo.lodLevel}
            />
          )
        })}
        
        <RearrangementAnimator entryRefs={entryRefs.current} />
        
        {/* Render ghost entries during drag */}
        {dragState.isDragging && dragState.entryId && dragState.originalPosition && dragState.previewPosition && (() => {
          const draggedEntry = entries.find(e => e.id === dragState.entryId)
          if (!draggedEntry) return null
          const renderInfo = entryRenderInfo.get(draggedEntry.id) || { isFacingCamera: true, lodLevel: 'near' };
          
          return (
            <>
              {/* Original position ghost at 75% opacity */}
              <GhostEntry
                position={dragState.originalPosition}
                opacity={0.75}
                color={SELECTED_ENTRY_COLOR}
                title={draggedEntry.title || draggedEntry.summary}
                isFacingCamera={renderInfo.isFacingCamera}
                hideBackText={true}
              />
              {/* New position ghost at 25% opacity */}
              <GhostEntry
                position={dragState.previewPosition}
                opacity={0.25}
                color={SELECTED_ENTRY_COLOR}
                title={draggedEntry.title || draggedEntry.summary}
                isFacingCamera={renderInfo.isFacingCamera}
                hideBackText={true}
              />
            </>
          )
        })()}
        
        {/* Render all connections */}
        {connections.map(connection => {
          const sourceEntry = entries.find(e => e.id === connection.sourceId)
          const targetEntry = entries.find(e => e.id === connection.targetId)
          const opacity = connectionOpacities.get(connection.id) ?? 1;
          
          if (!sourceEntry || !targetEntry) return null
          
          return (
            <Connection
              key={connection.id}
              connection={connection}
              sourceEntry={sourceEntry}
              targetEntry={targetEntry}
              opacity={opacity}
            />
          )
        })}
        
        {/* Performance Monitor (needs to be inside Canvas for useFrame) */}
        {showDevTools && <PerformanceMonitor onFPSUpdate={(fps) => {
          // Store FPS in a ref that can be accessed by FPSDisplay
          (window as unknown as { __currentFPS?: number }).__currentFPS = fps
        }} />}
      </Canvas>
      
      {/* Add Entry Button - Floating Action Button */}
      <button
        type="button"
        onClick={handleAddEntry}
        className="absolute bottom-6 right-6 z-20 bg-green-600 hover:bg-green-700 text-white shadow-xl rounded-full h-16 w-16 p-0 flex items-center justify-center transition-transform hover:scale-110"
        title="Add Entry"
      >
        <Plus className="h-8 w-8" />
      </button>
      
      
      {/* Help Overlay */}
      <HelpOverlay />
      
      {/* Connection Feedback */}
      {connectionFeedback && (
        <ConnectionFeedback
          message={connectionFeedback.message}
          onDismiss={() => {
            if (connectionFeedback.lastOperation) {
              // If clicking on the feedback, perform the undo action
              undoConnection()
            } else {
              clearConnectionFeedback()
            }
          }}
        />
      )}
      
      {/* Extended Help Modal */}
      <ExtendedHelpModal
        isOpen={showExtendedHelp}
        onClose={() => setShowExtendedHelp(false)}
      />
      
      {/* Debug Display */}
      <DebugDisplay show={showDevTools} rearrangementTargetPositions={useMindMapStore.getState().rearrangementTargetPositions} selectedEntryPosition={selectedEntry?.position} />
    </div>
  )
}