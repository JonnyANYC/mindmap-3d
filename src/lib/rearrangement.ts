
import * as THREE from 'three';
import type { MindMapEntry, Position3D } from '@/types/mindmap';

const BOUNDING_SPHERE_RADIUS = 5;
const REPULSION_STRENGTH = 0.5;
const ATTRACTION_STRENGTH = 0.1;
const DAMPING_FACTOR = 0.9;
const MAX_SPEED = 0.5;
const ITERATIONS = 100;

export function calculateRearrangedPositions(
  rootEntry: MindMapEntry,
  children: MindMapEntry[]
): Map<string, Position3D> {
  const newPositions = new Map<string, Position3D>();
  const velocities = new Map<string, THREE.Vector3>();

  // Initialize positions and velocities
  children.forEach(child => {
    newPositions.set(child.id, child.position);
    velocities.set(child.id, new THREE.Vector3());
  });

  for (let i = 0; i < ITERATIONS; i++) {
    children.forEach(child => {
      const childPosition = new THREE.Vector3(...newPositions.get(child.id)!);
      const childVelocity = velocities.get(child.id)!;

      // Attraction force towards the root
      const rootPosition = new THREE.Vector3(...rootEntry.position);
      const attractionForce = rootPosition.clone().sub(childPosition).multiplyScalar(ATTRACTION_STRENGTH);

      // Repulsion forces from other children
      const repulsionForce = new THREE.Vector3();
      children.forEach(otherChild => {
        if (child.id !== otherChild.id) {
          const otherPosition = new THREE.Vector3(...newPositions.get(otherChild.id)!);
          const direction = childPosition.clone().sub(otherPosition);
          const distance = direction.length();
          if (distance > 0) {
            const force = direction.normalize().multiplyScalar(REPULSION_STRENGTH / (distance * distance));
            repulsionForce.add(force);
          }
        }
      });

      // Total force
      const totalForce = attractionForce.add(repulsionForce);

      // Update velocity
      childVelocity.add(totalForce);
      childVelocity.multiplyScalar(DAMPING_FACTOR);
      if (childVelocity.length() > MAX_SPEED) {
        childVelocity.normalize().multiplyScalar(MAX_SPEED);
      }

      // Update position
      const newPos = childPosition.clone().add(childVelocity);
      newPositions.set(child.id, [newPos.x, newPos.y, newPos.z]);
    });
  }

  // Constrain to bounding sphere
  children.forEach(child => {
    const childPosition = new THREE.Vector3(...newPositions.get(child.id)!);
    const rootPosition = new THREE.Vector3(...rootEntry.position);
    const direction = childPosition.clone().sub(rootPosition);
    if (direction.length() > BOUNDING_SPHERE_RADIUS) {
        const newPos = rootPosition.clone().add(direction.normalize().multiplyScalar(BOUNDING_SPHERE_RADIUS));
        newPositions.set(child.id, [newPos.x, newPos.y, newPos.z]);
    }
  });

  return newPositions;
}
