'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Cylinder as DreiCylinder } from '@react-three/drei'
import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { Mesh, Vector3, Camera, OrbitControls as OrbitControlsImpl } from 'three'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { 
  useEntries, 
  useConnections, 
  useSelectedEntryId,
  useHoveredEntryId,
  useEntryActions,
  useConnectionFeedback,
  useConnectionActions
} from '@/hooks/useMindMapStore'
import { DEFAULT_ENTRY_COLOR, SELECTED_ENTRY_COLOR, HOVERED_ENTRY_COLOR } from '@/types/mindmap'
import type { Entry as EntryType, Connection as ConnectionType, Position3D } from '@/types/mindmap'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ConnectionFeedback } from '@/components/ConnectionFeedback'
import { useToast } from '@/hooks/use-toast'
import { useMindMapStore } from '@/lib/store'

interface EntryProps {
  entry: EntryType
  onDragStart?: (entryId: string, isShiftKey: boolean) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

// Custom hook to determine if positive Z side is facing camera
function useIsFacingCamera(position: Position3D) {
  const { camera } = useThree()
  const [isFacingCamera, setIsFacingCamera] = useState(true)
  
  useFrame(() => {
    // Get vector from entry to camera
    const entryPos = new Vector3(...position)
    const cameraToEntry = entryPos.clone().sub(camera.position)
    
    // Check if the positive Z normal is facing towards the camera
    // If dot product is negative, positive Z is facing camera
    const dotProduct = cameraToEntry.dot(new Vector3(0, 0, 1))
    setIsFacingCamera(dotProduct < 0)
  })
  
  return isFacingCamera
}

interface GhostEntryProps {
  position: Position3D
  opacity: number
  color: string
  summary: string
  hideBackText?: boolean
}

function GhostEntry({ position, opacity, color, summary, hideBackText = false }: GhostEntryProps) {
  const isFrontFacingCamera = useIsFacingCamera(position)
  
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1, 1, 0.05]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <Text
        visible={!hideBackText || isFrontFacingCamera}
        position={[0, 0, 0.026]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
        // @ts-expect-error - material props
        material-opacity={opacity}
        material-transparent
      >
        {summary}
      </Text>
      <Text
        visible={!hideBackText || !isFrontFacingCamera}
        position={[0, 0, -0.026]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
        rotation={[0, Math.PI, 0]}
        // @ts-expect-error - material props
        material-opacity={opacity}
        material-transparent
      >
        {summary}
      </Text>
    </group>
  )
}

function Entry({ entry, onDragStart, onDragEnd, isDragging }: EntryProps) {
  const meshRef = useRef<Mesh>(null!)
  const selectedEntryId = useSelectedEntryId()
  const hoveredEntryId = useHoveredEntryId()
  const { selectEntry, hoverEntry, toggleConnection } = useEntryActions()
  const { clearConnectionFeedback } = useConnectionActions()
  
  const isSelected = selectedEntryId === entry.id
  const isHovered = hoveredEntryId === entry.id
  
  const color = isSelected 
    ? SELECTED_ENTRY_COLOR 
    : isHovered 
      ? HOVERED_ENTRY_COLOR 
      : entry.color || DEFAULT_ENTRY_COLOR

  // Drag detection state
  const [dragStartPos, setDragStartPos] = useState<[number, number] | null>(null)
  const [pointerDown, setPointerDown] = useState(false)
  const dragThreshold = 5 // pixels
  
  // Determine which text to show during drag
  const isFrontFacingCamera = useIsFacingCamera(entry.position)
  
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
    <group position={entry.position} userData={{ isEntry: true }}>
      <mesh
        visible={!isDragging}
        ref={meshRef}
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
        visible={!isDragging || isFrontFacingCamera}
        position={[0, 0, 0.026]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
        // @ts-expect-error - pointerEvents prop exists but not in types
        pointerEvents="none"
      >
        {entry.summary}
      </Text>
      <Text
        visible={!isDragging || !isFrontFacingCamera}
        position={[0, 0, -0.026]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
        rotation={[0, Math.PI, 0]}
        // @ts-expect-error - pointerEvents prop exists but not in types
        pointerEvents="none"
      >
        {entry.summary}
      </Text>
      {isSelected && !isDragging && (
        <>
          <Text
            position={[0, 0.45, 0.026]}
            fontSize={0.06}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Click and drag to move
          </Text>
          <Text
            position={[0, -0.35, 0.026]}
            fontSize={0.08}
            color="white"
            anchorX="center"
            anchorY="middle"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Edit button clicked for entry:', entry.id)
              // TODO: Open editor dialog
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
            onClick={(e) => {
              e.stopPropagation()
              console.log('Edit button clicked for entry:', entry.id)
              // TODO: Open editor dialog
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

function Connection({ sourceEntry, targetEntry }: ConnectionProps) {
  const meshRef = useRef<Mesh>(null!)
  const { camera, raycaster, scene } = useThree()
  const [opacity, setOpacity] = useState(1)
  
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
  
  // Update opacity based on occlusion with improved detection
  useFrame(() => {
    if (!meshRef.current) return
    
    const cameraPos = camera.position.clone()
    
    // Cast rays from camera to multiple points along the connection
    const checkPoints = 5 // Number of points to check along the connection
    let occludedCount = 0
    
    for (let i = 0; i <= checkPoints; i++) {
      const t = i / checkPoints
      const checkPoint = new Vector3(
        sourceEntry.position[0] * (1 - t) + targetEntry.position[0] * t,
        sourceEntry.position[1] * (1 - t) + targetEntry.position[1] * t,
        sourceEntry.position[2] * (1 - t) + targetEntry.position[2] * t
      )
      
      // Set up raycaster from camera to check point
      const direction = checkPoint.clone().sub(cameraPos).normalize()
      raycaster.set(cameraPos, direction)
      
      // Check for intersections with entry boxes
      const intersects = raycaster.intersectObjects(scene.children, true)
      
      // Check if any entry is blocking the view
      for (const intersect of intersects) {
        const distance = cameraPos.distanceTo(checkPoint)
        if (intersect.distance < distance && intersect.object.type === 'Mesh') {
          // Check if the intersected object is an entry (Box)
          const parent = intersect.object.parent
          if (parent && parent.userData?.isEntry) {
            occludedCount++
            break
          }
        }
      }
    }
    
    // Calculate opacity based on occlusion percentage
    const occlusionRatio = occludedCount / (checkPoints + 1)
    let targetOpacity = 1
    
    if (occlusionRatio > 0.6) {
      targetOpacity = 0.15 // Heavily occluded
    } else if (occlusionRatio > 0.3) {
      targetOpacity = 0.4 // Partially occluded
    } else if (occlusionRatio > 0) {
      targetOpacity = 0.7 // Slightly occluded
    }
    
    // Smooth opacity transitions
    const opacityDiff = targetOpacity - opacity
    if (Math.abs(opacityDiff) > 0.01) {
      setOpacity(opacity + opacityDiff * 0.1)
    }
  })
  
  return (
    <DreiCylinder
      ref={meshRef}
      args={[0.01, 0.01, length, 8]}
      position={position}
      rotation={rotation}
    >
      <meshStandardMaterial 
        color={DEFAULT_ENTRY_COLOR}
        transparent 
        opacity={opacity}
      />
    </DreiCylinder>
  )
}

function CameraController({ 
  cameraRef, 
  onCameraMove 
}: { 
  cameraRef: { current: Camera | null }
  onCameraMove?: () => void 
}) {
  const { camera } = useThree()
  const previousPosition = useRef(new Vector3())
  const previousRotation = useRef(new Vector3())
  
  useFrame(() => {
    cameraRef.current = camera
    
    // Check for camera movement
    if (onCameraMove) {
      const positionThreshold = 0.1
      const rotationThreshold = 0.01
      
      const positionDelta = camera.position.distanceTo(previousPosition.current)
      const rotationDelta = new Vector3(
        camera.rotation.x,
        camera.rotation.y,
        camera.rotation.z
      ).distanceTo(previousRotation.current)
      
      if (positionDelta > positionThreshold || rotationDelta > rotationThreshold) {
        onCameraMove()
        previousPosition.current.copy(camera.position)
        previousRotation.current.set(
          camera.rotation.x,
          camera.rotation.y,
          camera.rotation.z
        )
      }
    }
  })
  
  return null
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

export default function Scene3D() {
  const entries = useEntries()
  const connections = useConnections()
  const { selectEntry, addEntry, moveEntry, deleteEntry } = useEntryActions()
  const selectedEntryId = useSelectedEntryId()
  const connectionFeedback = useConnectionFeedback()
  const { undoConnection, redoConnection, clearConnectionFeedback } = useConnectionActions()
  const cameraRef = useRef<Camera | null>(null)
  const orbitControlsRef = useRef<OrbitControlsImpl | null>(null)
  const { toast } = useToast()
  
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

  // Handle keyboard shortcuts for undo/redo, ESC cancellation, and Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          // Store the ID and summary before deletion
          const deletedId = entryToDelete.id
          const deletedSummary = entryToDelete.summary
          
          deleteEntry(selectedEntryId)
          
          // Show toast with undo option
          toast({
            title: "Entry deleted",
            description: `"${deletedSummary}" has been deleted.`,
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
                      description: `"${deletedSummary}" has been restored.`,
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
        undoConnection()
      }
      // Check for Ctrl/Cmd + Shift + Z (redo)
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        redoConnection()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoConnection, redoConnection, dragState, moveEntry, handleDragEnd, selectedEntryId, deleteEntry, entries, toast])
  
  const handleAddEntry = () => {
    if (!cameraRef.current) {
      // Fallback to random position if camera not ready
      addEntry()
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
    
    addEntry(newPosition)
  }
  
  // Determine cursor style based on drag state
  const getCursorStyle = () => {
    if (!dragState.isDragging) return 'auto'
    if (dragState.isShiftDrag) return 'ns-resize'
    return 'move'
  }
  
  return (
    <div className="w-full bg-gray-900" style={{ height: '550px', cursor: getCursorStyle() }}>
      <Canvas 
        onPointerMissed={() => {
          // Only deselect when clicking on empty space
          selectEntry(null)
        }}
        gl={{ antialias: true }}
        camera={{ fov: 75 }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 10, 50]} />
        
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        <OrbitControls 
          ref={orbitControlsRef}
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true} 
        />
        <CameraController 
          cameraRef={cameraRef} 
          onCameraMove={clearConnectionFeedback}
        />
        <DragController
          dragState={dragState}
          setDragState={setDragState}
        />
        
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <pointLight position={[0, 5, 0]} intensity={0.3} />
        
        {/* Render all entries */}
        {entries.map(entry => (
          <Entry 
            key={entry.id} 
            entry={entry}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isDragging={dragState.isDragging && dragState.entryId === entry.id}
          />
        ))}
        
        {/* Render ghost entries during drag */}
        {dragState.isDragging && dragState.entryId && dragState.originalPosition && dragState.previewPosition && (() => {
          const draggedEntry = entries.find(e => e.id === dragState.entryId)
          if (!draggedEntry) return null
          
          return (
            <>
              {/* Original position ghost at 75% opacity */}
              <GhostEntry
                position={dragState.originalPosition}
                opacity={0.75}
                color={SELECTED_ENTRY_COLOR}
                summary={draggedEntry.summary}
                hideBackText={true}
              />
              {/* New position ghost at 25% opacity */}
              <GhostEntry
                position={dragState.previewPosition}
                opacity={0.25}
                color={SELECTED_ENTRY_COLOR}
                summary={draggedEntry.summary}
                hideBackText={true}
              />
            </>
          )
        })()}
        
        {/* Render all connections */}
        {connections.map(connection => {
          const sourceEntry = entries.find(e => e.id === connection.sourceId)
          const targetEntry = entries.find(e => e.id === connection.targetId)
          
          if (!sourceEntry || !targetEntry) return null
          
          return (
            <Connection
              key={connection.id}
              connection={connection}
              sourceEntry={sourceEntry}
              targetEntry={targetEntry}
            />
          )
        })}
      </Canvas>
      
      {/* Add Entry Button */}
      <div className="absolute top-4 right-4">
        <Button 
          onClick={handleAddEntry}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Entry
        </Button>
      </div>
      
      {/* Help Overlay */}
      <div className="absolute bottom-4 left-4 bg-gray-800/90 text-white p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-bold mb-2">3D Mind Map controls</h2>
        <ul className="text-sm space-y-1">
          <li>🖱️ Left click + drag: Rotate camera</li>
          <li>🖱️ Right click + drag: Pan camera</li>
          <li>🖱️ Scroll: Zoom in/out</li>
          <li>📦 Click entry: Select</li>
          <li>🔗 Ctrl/Cmd + Click: Toggle connection</li>
          <li>🗑️ Delete: Delete selected entry</li>
          <li>↩️ Ctrl/Cmd + Z: Undo connection</li>
          <li>↪️ Ctrl/Cmd + Shift + Z: Redo connection</li>
          <li>✏️ Click [Edit] on selected: Open editor</li>
          <li>➕ Add Entry: Create new entry</li>
        </ul>
      </div>
      
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
    </div>
  )
}