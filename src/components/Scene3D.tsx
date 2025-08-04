'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Box, Plane, Grid, PerspectiveCamera, Text, Cylinder as DreiCylinder } from '@react-three/drei'
import { useRef, useState, useMemo } from 'react'
import { Mesh, Vector3 } from 'three'
import { useFrame, useThree } from '@react-three/fiber'

interface NodeProps {
  position?: [number, number, number]
  color?: string
  text?: string
  onClick?: () => void
}

function Node({ position = [0, 0, 0], color = 'green', text = 'Sample text', onClick }: NodeProps) {
  const meshRef = useRef<Mesh>(null!)
  const [hovered, setHover] = useState(false)

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={[1, 1, 0.1]}
        onClick={onClick}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <meshStandardMaterial color={hovered ? 'lightgreen' : color} />
      </Box>
      <Text
        position={[0, 0, 0.051]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  )
}

interface ConnectionProps {
  start: [number, number, number]
  end: [number, number, number]
  color?: string
}

function Connection({ start, end, color = 'green' }: ConnectionProps) {
  const meshRef = useRef<Mesh>(null!)
  const { camera } = useThree()
  const [opacity, setOpacity] = useState(1)
  
  // Calculate connection geometry
  const { position, rotation, length, connectionStart, connectionEnd } = useMemo(() => {
    const startVec = new Vector3(...start)
    const endVec = new Vector3(...end)
    
    // Determine which surfaces to connect (based on which are closest)
    // For now, we'll use a simple heuristic based on relative positions
    const direction = endVec.clone().sub(startVec).normalize()
    
    // Calculate the surface offset (0.05 for half the node depth + 0.5 gap)
    const offset = 0.05 + 0.5
    
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
      length: cylinderLength,
      connectionStart,
      connectionEnd
    }
  }, [start, end])
  
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
        color={color} 
        transparent 
        opacity={opacity}
      />
    </DreiCylinder>
  )
}

export default function Scene3D() {
  return (
    <div className="w-full bg-gray-100" style={{ height: '550px' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        
        <Node position={[-1.5, 0, 0]} color="green" />
        <Node position={[-0.5, 1, 1]} color="green" text="Node 2" />
        <Connection start={[-1.5, 0, 0]} end={[-0.5, 1, 1]} color="green" />
        
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
        <h2 className="text-xl font-bold mb-2">3D Scene Controls</h2>
        <ul className="text-sm space-y-1">
          <li>🖱️ Left click + drag: Rotate camera</li>
          <li>🖱️ Right click + drag: Pan camera</li>
          <li>🖱️ Scroll: Zoom in/out</li>
          <li>📦 Hover over the node to highlight</li>
        </ul>
      </div>
    </div>
  )
}