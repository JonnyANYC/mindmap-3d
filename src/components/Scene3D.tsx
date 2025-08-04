'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Box, Sphere, Plane, Grid, PerspectiveCamera, Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import { Mesh } from 'three'

interface NodeProps {
  position?: [number, number, number]
  color?: string
  text?: string
  onClick?: () => void
}

function Node({ position = [0, 0, 0], color = 'green', text = 'Sample text', onClick }: NodeProps) {
  const meshRef = useRef<Mesh>(null!)
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={[1, 1, 0.1]}
        scale={active ? 1.2 : 1}
        onClick={() => {
          setActive(!active)
          onClick?.()
        }}
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

function InteractiveSphere() {
  const [hovered, setHover] = useState(false)
  
  return (
    <Sphere
      args={[0.7, 32, 32]}
      position={[1.5, 0, 0]}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <meshStandardMaterial color={hovered ? 'lightblue' : 'blue'} />
    </Sphere>
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
        <InteractiveSphere />
        
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
          <li>📦 Click the green node to scale it</li>
          <li>🔵 Hover over objects to highlight</li>
        </ul>
      </div>
    </div>
  )
}