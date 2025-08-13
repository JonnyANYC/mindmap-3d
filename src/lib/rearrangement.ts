import type { Entry, Position3D } from '@/types/mindmap';
import * as THREE from 'three';

export function calculateRearrangedPositions(
  rootEntry: Entry,
  children: Entry[]
): Map<string, Position3D> {
  const newPositions = new Map<string, Position3D>();
  const rootPos = new THREE.Vector3(...rootEntry.position);

  if (children.length <= 6) {
    // Simplified re-arrangement for 6 or fewer children
    const offsets: Position3D[] = [
      [5, 0, 0],    // +X
      [-5, 0, 0],   // -X
      [0, 5, 0],    // +Y
      [0, -5, 0],   // -Y
      [0, 0, 5],    // +Z
      [0, 0, -5]    // -Z
    ];

    children.forEach((child, index) => {
      const offset = offsets[index % offsets.length];
      const newPos: Position3D = [
        rootPos.x + offset[0],
        rootPos.y + offset[1],
        rootPos.z + offset[2]
      ];
      newPositions.set(child.id, newPos);
    });
  } else {
    // Force-directed re-arrangement (placeholder for now)
    // This will be implemented in a later step (Issue #76)
    children.forEach(child => {
      newPositions.set(child.id, [...child.position]); // Keep current position for now
    });
  }

  return newPositions;
}
