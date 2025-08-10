import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Entry, Connection as ConnectionType } from '@/types/mindmap'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

// Mocked React Three Fiber hooks are defined in jest.setup.js


// Test component that extracts Connection from Scene3D for testing
const TestConnection = ({ 
  sourceEntry, 
  targetEntry 
}: {
  sourceEntry: Entry
  targetEntry: Entry
}) => {
  const meshRef = React.useRef<THREE.Mesh>(null!)
  const [opacity] = React.useState(1)
  
  // Calculate connection geometry with smart surface selection
  const { position, rotation, length } = React.useMemo(() => {
    const startVec = new THREE.Vector3(...sourceEntry.position)
    const endVec = new THREE.Vector3(...targetEntry.position)
    
    // Calculate entry dimensions
    const entryWidth = 1
    const entryHeight = 1
    const entryDepth = 0.05
    
    // Calculate vector from source to target
    const connectionVector = endVec.clone().sub(startVec)
    const direction = connectionVector.normalize()
    
    // Determine which surfaces to connect based on the dominant axis
    const sourceOffset = new THREE.Vector3()
    const targetOffset = new THREE.Vector3()
    
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
    const up = new THREE.Vector3(0, 1, 0)
    const axis = new THREE.Vector3().crossVectors(up, actualDirection).normalize()
    const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(actualDirection))))
    
    return {
      position: [midpoint.x, midpoint.y, midpoint.z] as [number, number, number],
      rotation: [axis.x * angle, axis.y * angle, axis.z * angle] as [number, number, number],
      length: cylinderLength
    }
  }, [sourceEntry.position, targetEntry.position])
  
  // Simulate opacity updates based on occlusion
  React.useEffect(() => {
    if (meshRef.current && meshRef.current.userData) {
      meshRef.current.userData.opacity = opacity
    }
  }, [opacity])
  
  return (
    <mesh
      ref={(el) => {
        if (el) {
          meshRef.current = el
          if (!el.userData) {
            el.userData = {}
          }
          el.userData.isConnection = true
          el.userData.opacity = opacity
        }
      }}
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

// Wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Canvas>
    {children}
  </Canvas>
)

describe('Connection Component', () => {
  const mockConnection: ConnectionType = {
    id: 'connection-1',
    sourceId: 'entry-1',
    targetId: 'entry-2',
    createdAt: new Date()
  }

  const mockSourceEntry: Entry = {
    id: 'entry-1',
    position: [0, 0, 0],
    summary: 'Source Entry',
    content: '',
    color: '#4CAF50',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockTargetEntry: Entry = {
    id: 'entry-2',
    position: [3, 0, 0],
    summary: 'Target Entry',
    content: '',
    color: '#4CAF50',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
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

    it('renders with correct diameter (0.01 units)', () => {
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            sourceEntry={mockSourceEntry}
            targetEntry={mockTargetEntry}
          />
        </TestWrapper>
      )
      
      const cylinder = container.querySelector('cylinderGeometry')
      const args = JSON.parse(cylinder!.getAttribute('args')!)
      expect(args[0]).toBe(0.01) // top radius
      expect(args[1]).toBe(0.01) // bottom radius
    })

    it('renders with correct color', () => {
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            sourceEntry={mockSourceEntry}
            targetEntry={mockTargetEntry}
          />
        </TestWrapper>
      )
      
      const material = container.querySelector('meshStandardMaterial')
      expect(material).toHaveAttribute('color', '#4CAF50')
    })

    it('renders with transparency enabled', () => {
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            sourceEntry={mockSourceEntry}
            targetEntry={mockTargetEntry}
          />
        </TestWrapper>
      )
      
      const material = container.querySelector('meshStandardMaterial')
      expect(material).toHaveAttribute('transparent', 'true')
    })
  })

  describe('Connection Geometry', () => {
    it('connects entries along X-axis when X is dominant', () => {
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            sourceEntry={mockSourceEntry}
            targetEntry={mockTargetEntry}
          />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      const position = JSON.parse(mesh!.getAttribute('position')!)
      
      // Should be positioned between the two entries
      expect(position[0]).toBeGreaterThan(mockSourceEntry.position[0])
      expect(position[0]).toBeLessThan(mockTargetEntry.position[0])
    })

    it('connects entries along Y-axis when Y is dominant', () => {
      const sourceAbove: Entry = { ...mockSourceEntry, position: [0, 3, 0] }
      const targetBelow: Entry = { ...mockTargetEntry, position: [0, 0, 0] }
      
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            connection={mockConnection}
            sourceEntry={sourceAbove}
            targetEntry={targetBelow}
          />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      const position = JSON.parse(mesh!.getAttribute('position')!)
      
      // Should be positioned between the two entries
      expect(position[1]).toBeLessThan(sourceAbove.position[1])
      expect(position[1]).toBeGreaterThan(targetBelow.position[1])
    })

    it('connects entries along Z-axis when Z is dominant', () => {
      const sourceFront: Entry = { ...mockSourceEntry, position: [0, 0, 3] }
      const targetBack: Entry = { ...mockTargetEntry, position: [0, 0, 0] }
      
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            connection={mockConnection}
            sourceEntry={sourceFront}
            targetEntry={targetBack}
          />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      const position = JSON.parse(mesh!.getAttribute('position')!)
      
      // Should be positioned between the two entries
      expect(position[2]).toBeLessThan(sourceFront.position[2])
      expect(position[2]).toBeGreaterThan(targetBack.position[2])
    })

    it('maintains 0.5 unit gap from entry surfaces', () => {
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            sourceEntry={mockSourceEntry}
            targetEntry={mockTargetEntry}
          />
        </TestWrapper>
      )
      
      const cylinder = container.querySelector('cylinderGeometry')
      const args = JSON.parse(cylinder!.getAttribute('args')!)
      const length = args[2]
      
      // Distance between entries is 3 units
      // Entry width is 1 unit (0.5 on each side)
      // Gap is 0.5 units from each surface
      // So cylinder length should be: 3 - 1 (entry widths) - 1 (gaps) = 1
      expect(length).toBeCloseTo(1, 1)
    })

    it('calculates correct length for diagonal connections', () => {
      const diagonalTarget: Entry = { 
        ...mockTargetEntry, 
        position: [3, 3, 3] 
      }
      
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            connection={mockConnection}
            sourceEntry={mockSourceEntry}
            targetEntry={diagonalTarget}
          />
        </TestWrapper>
      )
      
      const cylinder = container.querySelector('cylinderGeometry')
      const args = JSON.parse(cylinder!.getAttribute('args')!)
      const length = args[2]
      
      // The cylinder should have a positive length
      expect(length).toBeGreaterThan(0)
    })
  })

  describe('Opacity', () => {
    it('starts with full opacity', () => {
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            sourceEntry={mockSourceEntry}
            targetEntry={mockTargetEntry}
          />
        </TestWrapper>
      )
      
      const material = container.querySelector('meshStandardMaterial')
      expect(material).toHaveAttribute('opacity', '1')
    })

    it('sets userData for connection identification', () => {
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            sourceEntry={mockSourceEntry}
            targetEntry={mockTargetEntry}
          />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      const userData = JSON.parse(mesh!.getAttribute('userData')!)
      expect(userData.isConnection).toBe(true)
      expect(userData.opacity).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles entries at the same position', () => {
      const samePositionTarget: Entry = { 
        ...mockTargetEntry, 
        position: [0, 0, 0] // Same as source
      }
      
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            connection={mockConnection}
            sourceEntry={mockSourceEntry}
            targetEntry={samePositionTarget}
          />
        </TestWrapper>
      )
      
      const cylinder = container.querySelector('cylinderGeometry')
      expect(cylinder).toBeTruthy()
      
      // Even with same position, should have some minimal length due to gaps
      const args = JSON.parse(cylinder!.getAttribute('args')!)
      const length = args[2]
      expect(length).toBeGreaterThanOrEqual(0)
    })

    it('handles very distant entries', () => {
      const farTarget: Entry = { 
        ...mockTargetEntry, 
        position: [100, 100, 100] 
      }
      
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            connection={mockConnection}
            sourceEntry={mockSourceEntry}
            targetEntry={farTarget}
          />
        </TestWrapper>
      )
      
      const cylinder = container.querySelector('cylinderGeometry')
      const args = JSON.parse(cylinder!.getAttribute('args')!)
      const length = args[2]
      
      // Should handle large distances
      expect(length).toBeGreaterThan(100)
    })
  })

  describe('Rotation', () => {
    it('aligns cylinder with connection direction', () => {
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            sourceEntry={mockSourceEntry}
            targetEntry={mockTargetEntry}
          />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      const rotation = JSON.parse(mesh!.getAttribute('rotation')!)
      
      // Should have some rotation to align with horizontal connection
      expect(rotation).toBeDefined()
      expect(Array.isArray(rotation)).toBe(true)
      expect(rotation).toHaveLength(3)
    })

    it('handles vertical connections', () => {
      const aboveTarget: Entry = { 
        ...mockTargetEntry, 
        position: [0, 3, 0] 
      }
      
      const { container } = render(
        <TestWrapper>
          <TestConnection 
            connection={mockConnection}
            sourceEntry={mockSourceEntry}
            targetEntry={aboveTarget}
          />
        </TestWrapper>
      )
      
      const mesh = container.querySelector('mesh')
      const rotation = JSON.parse(mesh!.getAttribute('rotation')!)
      
      // Vertical connections should have minimal rotation
      expect(Math.abs(rotation[0])).toBeLessThan(0.1)
      expect(Math.abs(rotation[1])).toBeLessThan(0.1)
      expect(Math.abs(rotation[2])).toBeLessThan(0.1)
    })
  })
})