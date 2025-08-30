import { calculateRearrangedPositions, calculateSimplifiedPositions, rearrangeMindMap } from '@/lib/rearrangement'
import type { MindMapEntry, Connection } from '@/types/mindmap'
import * as THREE from 'three'

const MIN_DISTANCE_FROM_ROOT = 1.5
const BOUNDING_SPHERE_RADIUS = 5

function createEntry(id: string, x: number, y: number, z: number): MindMapEntry {
  return {
    id,
    summary: `Entry ${id}`,
    content: '',
    position: [x, y, z],
    color: '#ffffff',
    isRoot: false
  }
}

function createConnection(sourceId: string, targetId: string): Connection {
  return {
    id: `${sourceId}-${targetId}`,
    sourceId,
    targetId
  }
}

function calculateDistance(pos1: [number, number, number], pos2: [number, number, number]): number {
  const vec1 = new THREE.Vector3(...pos1)
  const vec2 = new THREE.Vector3(...pos2)
  return vec1.distanceTo(vec2)
}

describe('Rearrangement Functions', () => {
  describe('calculateRearrangedPositions', () => {
    it('should return positions for all children', () => {
      const rootEntry = createEntry('root', 0, 0, 0)
      const children = [
        createEntry('child1', 1, 0, 0),
        createEntry('child2', 0, 1, 0),
        createEntry('child3', 0, 0, 1)
      ]

      const result = calculateRearrangedPositions(rootEntry, children)

      // Should return a position for each child
      expect(result.size).toBe(3)
      expect(result.has('child1')).toBe(true)
      expect(result.has('child2')).toBe(true)
      expect(result.has('child3')).toBe(true)
    })

    it('should keep entries within bounding sphere', () => {
      const rootEntry = createEntry('root', 0, 0, 0)
      const children = [
        createEntry('child1', 10, 0, 0), // Far from root
        createEntry('child2', 0, 10, 0),
        createEntry('child3', 0, 0, 10)
      ]

      const result = calculateRearrangedPositions(rootEntry, children)

      // All children should be within BOUNDING_SPHERE_RADIUS
      children.forEach(child => {
        const newPosition = result.get(child.id)!
        const distance = calculateDistance(newPosition, rootEntry.position)
        expect(distance).toBeLessThanOrEqual(BOUNDING_SPHERE_RADIUS)
      })
    })

    it('should handle well-spaced entries correctly', () => {
      const rootEntry = createEntry('root', 0, 0, 0)
      const children = [
        createEntry('child1', 3, 0, 0), // Well-spaced from root
        createEntry('child2', 0, 3, 0),
      ]

      const result = calculateRearrangedPositions(rootEntry, children)

      // Should return valid positions
      expect(result.size).toBe(2)
      children.forEach(child => {
        const newPosition = result.get(child.id)!
        expect(newPosition).toBeDefined()
        expect(Array.isArray(newPosition)).toBe(true)
        expect(newPosition.length).toBe(3)
      })
    })
  })

  describe('calculateSimplifiedPositions', () => {
    it('should place children exactly 5 units from root on axes', () => {
      const rootEntry = createEntry('root', 1, 2, 3)
      const children = [
        createEntry('child1', 0, 0, 0),
        createEntry('child2', 10, 10, 10),
        createEntry('child3', -5, -5, -5)
      ]

      const result = calculateSimplifiedPositions(rootEntry, children)


      // First child should be at +5 on x-axis
      const pos1 = result.get('child1')!
      expect(pos1[0]).toBe(6) // root.x + 5
      expect(pos1[1]).toBe(2) // root.y
      expect(pos1[2]).toBe(3) // root.z

      // Second child should be at -5 on x-axis  
      const pos2 = result.get('child2')!
      expect(pos2[0]).toBe(-4) // root.x - 5
      expect(pos2[1]).toBe(2)  // root.y
      expect(pos2[2]).toBe(3)  // root.z

      // Third child should be at +5 on y-axis
      const pos3 = result.get('child3')!
      expect(pos3[0]).toBe(1) // root.x
      expect(pos3[1]).toBe(7) // root.y + 5
      expect(pos3[2]).toBe(3) // root.z
    })

    it('should handle 6 children correctly', () => {
      const rootEntry = createEntry('root', 0, 0, 0)
      const children = Array.from({ length: 6 }, (_, i) => createEntry(`child${i + 1}`, 0, 0, 0))

      const result = calculateSimplifiedPositions(rootEntry, children)

      const expectedPositions = [
        [5, 0, 0],   // +x
        [-5, 0, 0],  // -x
        [0, 5, 0],   // +y
        [0, -5, 0],  // -y
        [0, 0, 5],   // +z
        [0, 0, -5]   // -z
      ]

      children.forEach((child, index) => {
        const position = result.get(child.id)!
        expect(position).toEqual(expectedPositions[index])
      })
    })
  })

  describe('rearrangeMindMap', () => {
    it('should rearrange connected entries', () => {
      const entries = [
        { ...createEntry('root', 0, 0, 0), isRoot: true },
        createEntry('child1', 1, 0, 0),
        createEntry('child2', 0, 1, 0),
        createEntry('grandchild1', 2, 0, 0),
        createEntry('grandchild2', 0, 2, 0)
      ]

      const connections = [
        createConnection('root', 'child1'),
        createConnection('root', 'child2'),
        createConnection('child1', 'grandchild1'),
        createConnection('child2', 'grandchild2')
      ]

      const rootEntry = entries[0]
      const { newPositions, updatedEntries } = rearrangeMindMap(rootEntry, entries, connections)

      // Should rearrange connected entries
      expect(newPositions.size).toBeGreaterThan(0)
      expect(updatedEntries.length).toBe(entries.length)
      
      // Should rearrange the children of root
      expect(newPositions.has('child1')).toBe(true)
      expect(newPositions.has('child2')).toBe(true)
    })

    it('should not rearrange the same entry twice', () => {
      const entries = [
        { ...createEntry('root', 0, 0, 0), isRoot: true },
        createEntry('child1', 1, 0, 0),
        createEntry('child2', 0, 1, 0),
        createEntry('shared', 2, 2, 0) // Connected to both children
      ]

      const connections = [
        createConnection('root', 'child1'),
        createConnection('root', 'child2'),
        createConnection('child1', 'shared'),
        createConnection('child2', 'shared')
      ]

      const rootEntry = entries[0]
      const { newPositions } = rearrangeMindMap(rootEntry, entries, connections)

      // The shared entry should only be repositioned once
      // This is verified by the function completing without infinite loops
      expect(newPositions.has('shared')).toBe(true)
      expect(newPositions.size).toBeGreaterThan(0)
    })

    it('should handle disconnected entries gracefully', () => {
      const entries = [
        { ...createEntry('root', 0, 0, 0), isRoot: true },
        createEntry('child1', 1, 0, 0),
        createEntry('isolated', 10, 10, 10) // No connections
      ]

      const connections = [
        createConnection('root', 'child1')
      ]

      const rootEntry = entries[0]
      const { newPositions } = rearrangeMindMap(rootEntry, entries, connections)

      // Only connected entries should be rearranged
      expect(newPositions.has('child1')).toBe(true)
      expect(newPositions.has('isolated')).toBe(false)
    })
  })
})