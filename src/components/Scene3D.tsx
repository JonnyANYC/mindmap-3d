'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Box, Plane, Grid, PerspectiveCamera, Text, Cylinder as DreiCylinder } from '@react-three/drei'
import { useRef, useState, useMemo } from 'react'
import { Mesh, Vector3 } from 'three'
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
      <Box
        ref={meshRef}
        args={[1, 1, 0.05]}
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
        <meshStandardMaterial color={color} />
      </Box>
      <Text
        position={[0, 0, 0.026]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.9}
      >
        {entry.summary}
      </Text>
      {isSelected && (
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
      )}
    </group>
  )
}

interface ConnectionProps {
  connection: ConnectionType
  sourceEntry: EntryType
  targetEntry: EntryType
}

function Connection({ connection, sourceEntry, targetEntry }: ConnectionProps) {
  const meshRef = useRef<Mesh>(null!)
  const { camera } = useThree()
  const [opacity, setOpacity] = useState(1)
  
  // Calculate connection geometry
  const { position, rotation, length } = useMemo(() => {
    const startVec = new Vector3(...sourceEntry.position)
    const endVec = new Vector3(...targetEntry.position)
    
    // Direction from start to end
    const direction = endVec.clone().sub(startVec).normalize()
    
    // Calculate the surface offset (0.025 for half the entry depth + 0.5 gap)
    const offset = 0.025 + 0.5
    
    // Adjust start and end points to create gaps
    const connectionStart = startVec.clone().add(direction.clone().multiplyScalar(offset))
    const connectionEnd = endVec.clone().sub(direction.clone().multiplyScalar(offset))
    
    // Calculate cylinder position (midpoint) and length
    const midpoint = connectionStart.clone().add(connectionEnd).multiplyScalar(0.5)
    const cylinderLength = connectionStart.distanceTo(connectionEnd)
    
    // Calculate rotation to align cylinder with connection direction
    const up = new Vector3(0, 1, 0)
    const axis = new Vector3().crossVectors(up, direction).normalize()
    const angle = Math.acos(up.dot(direction))
    
    return {
      position: [midpoint.x, midpoint.y, midpoint.z] as [number, number, number],
      rotation: [axis.x * angle, axis.y * angle, axis.z * angle] as [number, number, number],
      length: cylinderLength
    }
  }, [sourceEntry.position, targetEntry.position])
  
  // Update opacity based on occlusion
  useFrame(() => {
    if (!meshRef.current) return
    
    // Check if the connection is behind the camera or occluded
    const meshPosition = new Vector3(...position)
    const cameraDirection = new Vector3()
    camera.getWorldDirection(cameraDirection)
    
    const toMesh = meshPosition.clone().sub(camera.position).normalize()
    const dotProduct = cameraDirection.dot(toMesh)
    
    // If behind camera or at steep angle, reduce opacity
    const newOpacity = dotProduct < 0.3 ? 0.25 : 1
    if (Math.abs(newOpacity - opacity) > 0.01) {
      setOpacity(newOpacity)
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

export default function Scene3D() {
  const entries = useEntries()
  const connections = useConnections()
  const { selectEntry } = useEntryActions()
  
  return (
    <div className="w-full bg-gray-100" style={{ height: '550px' }}>
      <Canvas 
        shadows
        onClick={() => selectEntry(null)}
      >
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        
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
        
        <Plane
          args={[10, 10]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="lightgray" />
        </Plane>
        
        <Grid args={[10, 10]} position={[0, -0.99, 0]} />
      </Canvas>
      
      <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">3D Mind Map Controls</h2>
        <ul className="text-sm space-y-1">
          <li>🖱️ Left click + drag: Rotate camera</li>
          <li>🖱️ Right click + drag: Pan camera</li>
          <li>🖱️ Scroll: Zoom in/out</li>
          <li>📦 Click entry: Select</li>
          <li>✏️ Click [Edit] on selected: Open editor</li>
        </ul>
      </div>
    </div>
  )
}