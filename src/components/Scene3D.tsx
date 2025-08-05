'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Cylinder as DreiCylinder } from '@react-three/drei'
import { useRef, useState, useMemo } from 'react'
import { Mesh, Vector3, Camera } from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { 
  useEntries, 
  useConnections, 
  useSelectedEntryId,
  useHoveredEntryId,
  useEntryActions 
} from '@/hooks/useMindMapStore'
import { DEFAULT_ENTRY_COLOR, SELECTED_ENTRY_COLOR, HOVERED_ENTRY_COLOR } from '@/types/mindmap'
import type { Entry as EntryType, Connection as ConnectionType } from '@/types/mindmap'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface EntryProps {
  entry: EntryType
}

function Entry({ entry }: EntryProps) {
  const meshRef = useRef<Mesh>(null!)
  const selectedEntryId = useSelectedEntryId()
  const hoveredEntryId = useHoveredEntryId()
  const { selectEntry, hoverEntry } = useEntryActions()
  
  const isSelected = selectedEntryId === entry.id
  const isHovered = hoveredEntryId === entry.id
  
  const color = isSelected 
    ? SELECTED_ENTRY_COLOR 
    : isHovered 
      ? HOVERED_ENTRY_COLOR 
      : entry.color || DEFAULT_ENTRY_COLOR

  return (
    <group position={entry.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          selectEntry(entry.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          hoverEntry(entry.id)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          hoverEntry(null)
        }}
      >
        <boxGeometry args={[1, 1, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
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
      {isSelected && (
        <>
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

function CameraController({ cameraRef }: { cameraRef: { current: Camera | null } }) {
  const { camera } = useThree()
  
  useFrame(() => {
    cameraRef.current = camera
  })
  
  return null
}

export default function Scene3D() {
  const entries = useEntries()
  const connections = useConnections()
  const { selectEntry, addEntry } = useEntryActions()
  const selectedEntryId = useSelectedEntryId()
  const cameraRef = useRef<Camera | null>(null)
  
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
  
  return (
    <div className="w-full bg-gray-900" style={{ height: '550px' }}>
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
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <CameraController cameraRef={cameraRef} />
        
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <pointLight position={[0, 5, 0]} intensity={0.3} />
        
        {/* Render all entries */}
        {entries.map(entry => (
          <Entry key={entry.id} entry={entry} />
        ))}
        
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
          <li>✏️ Click [Edit] on selected: Open editor</li>
          <li>➕ Add Entry: Create new entry</li>
        </ul>
      </div>
    </div>
  )
}