import * as THREE from 'three';
import type { MindMapEntry, Position3D, Connection } from '@/types/mindmap';

const BOUNDING_SPHERE_RADIUS = 5;
const REPULSION_STRENGTH = 0.5;
const ATTRACTION_STRENGTH = 0.1;
const DAMPING_FACTOR = 0.9;
const MAX_SPEED = 0.5;
const ITERATIONS = 100;

export function calculateRearrangedPositions(
  rootEntry: MindMapEntry,
  children: MindMapEntry[],
  onProgress?: (progress: number) => void
): Map<string, Position3D> {
  const newPositions = new Map<string, Position3D>();
  const velocities = new Map<string, THREE.Vector3>();

  // Initialize positions and velocities
  children.forEach(child => {
    newPositions.set(child.id, child.position);
    velocities.set(child.id, new THREE.Vector3());
  });

  for (let i = 0; i < ITERATIONS; i++) {
    if (onProgress) {
      onProgress((i + 1) / ITERATIONS);
    }
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

export function calculateSimplifiedPositions(
  rootEntry: MindMapEntry,
  children: MindMapEntry[]
): Map<string, Position3D> {
  const newPositions = new Map<string, Position3D>();
  const rootPosition = new THREE.Vector3(...rootEntry.position);
  const distance = 5;

  const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
  const signs = [1, -1];
  let axisIndex = 0;
  let signIndex = 0;

  children.forEach(child => {
    const offset = new THREE.Vector3();
    const axis = axes[axisIndex];
    const sign = signs[signIndex];

    offset[axis] = distance * sign;

    const newPos = rootPosition.clone().add(offset);
    newPositions.set(child.id, [newPos.x, newPos.y, newPos.z]);

    // Cycle through axes and signs
    signIndex++;
    if (signIndex >= signs.length) {
      signIndex = 0;
      axisIndex++;
      if (axisIndex >= axes.length) {
        axisIndex = 0; // Should not happen with <= 6 children
      }
    }
  });

  return newPositions;
}

export function rearrangeMindMap(
  rootEntry: MindMapEntry,
  entries: MindMapEntry[],
  connections: Connection[],
  onProgress?: (progress: number) => void
): { newPositions: Map<string, Position3D>, updatedEntries: MindMapEntry[] } {
  const allNewPositions = new Map<string, Position3D>();
  const rearrangedEntries = new Set<string>();
  const localEntries = JSON.parse(JSON.stringify(entries));

  function getChildren(entryId: string): MindMapEntry[] {
    const childrenIds = connections
      .filter(c => c.sourceId === entryId || c.targetId === entryId)
      .map(c => c.sourceId === entryId ? c.targetId : c.sourceId);
    return localEntries.filter((e: MindMapEntry) => childrenIds.includes(e.id) && !rearrangedEntries.has(e.id));
  }

  function rearrange(currentEntry: MindMapEntry) {
    console.log('rearranging', currentEntry.id);
    if (rearrangedEntries.has(currentEntry.id)) {
      return;
    }
    rearrangedEntries.add(currentEntry.id);

    const children = getChildren(currentEntry.id);
    console.log('found', children.length, 'children');
    if (children.length === 0) {
      return;
    }

    const newChildPositions =
      children.length <= 6
        ? calculateSimplifiedPositions(currentEntry, children)
        : calculateRearrangedPositions(currentEntry, children, (progress) => {
            if (onProgress) {
              const totalProgress = (rearrangedEntries.size + progress) / entries.length;
              onProgress(totalProgress);
            }
          });

    newChildPositions.forEach((pos, id) => {
      const entryToUpdate = localEntries.find((e: MindMapEntry) => e.id === id);
      if (entryToUpdate) {
        entryToUpdate.position = pos;
      }
      allNewPositions.set(id, pos);
    });

    children.forEach(child => {
      const updatedChild = localEntries.find((e: MindMapEntry) => e.id === child.id);
      if(updatedChild) {
        rearrange(updatedChild);
      }
    });
  }

  rearrange(rootEntry);
  return { newPositions: allNewPositions, updatedEntries: localEntries };
}