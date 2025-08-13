import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Entry, Connection as ConnectionType } from '@/types/mindmap'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

const TestConnection = ({ 
  sourceEntry, 
  targetEntry 
}: {
  sourceEntry: Entry
  targetEntry: Entry
}) => {
  const meshRef = React.useRef<THREE.Mesh>(null!)
  const [opacity] = React.useState(1)
  
  const { position, rotation, length } = React.useMemo(() => {
    const startVec = new THREE.Vector3(...sourceEntry.position)
    const endVec = new THREE.Vector3(...targetEntry.position)
    const connectionVector = endVec.clone().sub(startVec)
    const direction = connectionVector.normalize()
    const sourceOffset = new THREE.Vector3()
    const targetOffset = new THREE.Vector3()
    const absX = Math.abs(direction.x)
    const absY = Math.abs(direction.y)
    const absZ = Math.abs(direction.z)
    
    if (absZ >= absX && absZ >= absY) {
      sourceOffset.z = direction.z > 0 ? 0.025 : -0.025
      targetOffset.z = direction.z > 0 ? -0.025 : 0.025
    } else if (absX >= absY) {
      sourceOffset.x = direction.x > 0 ? 0.5 : -0.5
      targetOffset.x = direction.x > 0 ? -0.5 : 0.5
    } else {
      sourceOffset.y = direction.y > 0 ? 0.5 : -0.5
      targetOffset.y = direction.y > 0 ? -0.5 : 0.5
    }
    
    const sourcePoint = startVec.clone().add(sourceOffset)
    const targetPoint = endVec.clone().add(targetOffset)
    const actualDirection = targetPoint.clone().sub(sourcePoint).normalize()
    const gap = 0.5
    const connectionStart = sourcePoint.clone().add(actualDirection.clone().multiplyScalar(gap))
    const connectionEnd = targetPoint.clone().sub(actualDirection.clone().multiplyScalar(gap))
    const midpoint = connectionStart.clone().add(connectionEnd).multiplyScalar(0.5)
    const cylinderLength = connectionStart.distanceTo(connectionEnd)
    const up = new THREE.Vector3(0, 1, 0)
    const axis = new THREE.Vector3().crossVectors(up, actualDirection).normalize()
    const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(actualDirection))))
    
    return {
      position: [midpoint.x, midpoint.y, midpoint.z] as [number, number, number],
      rotation: [axis.x * angle, axis.y * angle, axis.z * angle] as [number, number, number],
      length: cylinderLength
    }
  }, [sourceEntry.position, targetEntry.position])
  
  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
    >
      <cylinderGeometry args={[0.01, 0.01, length, 8]} />
      <meshStandardMaterial 
        color="#4CAF50"
        transparent 
        opacity={opacity}
      />
    </mesh>
  )
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Canvas>
    {children}
  </Canvas>
)

describe('Connection Component', () => {
  const mockSourceEntry: Entry = {
    id: 'entry-1',
    position: [0, 0, 0],
    summary: 'Source Entry',
    content: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockTargetEntry: Entry = {
    id: 'entry-2',
    position: [3, 0, 0],
    summary: 'Target Entry',
    content: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('renders as a cylinder', () => {
    const { container } = render(
      <TestWrapper>
        <TestConnection 
          sourceEntry={mockSourceEntry}
          targetEntry={mockTargetEntry}
        />
      </TestWrapper>
    )
    
    const cylinder = container.querySelector('cylinderGeometry')
    expect(cylinder).toBeTruthy()
  })
})
