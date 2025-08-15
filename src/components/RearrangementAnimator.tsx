
import { useFrame } from '@react-three/fiber';
import { useMindMapStore } from '@/lib/store';
import * as THREE from 'three';

export function RearrangementAnimator({ entryRefs }: { entryRefs: Map<string, THREE.Group | null> }) {
  const targetPositions = useMindMapStore((state) => state.rearrangementTargetPositions);
  const { moveEntry, clearRearrangement } = useMindMapStore((state) => state);

  useFrame((_, delta) => {
    if (!targetPositions) return;

    let allEntriesAtTarget = true;

    targetPositions.forEach((targetPosition, entryId) => {
      const entryObject = entryRefs.get(entryId);
      if (entryObject) {
        const currentPosition = entryObject.position;
        const target = new THREE.Vector3(...targetPosition);

        if (currentPosition.distanceTo(target) > 0.01) {
          allEntriesAtTarget = false;
          const newPosition = currentPosition.lerp(target, delta * 5);
          entryObject.position.set(newPosition.x, newPosition.y, newPosition.z);
        } else {
          entryObject.position.set(...targetPosition);
        }
      }
    });

    if (allEntriesAtTarget) {
      targetPositions.forEach((targetPosition, entryId) => {
        moveEntry(entryId, targetPosition);
      });
      clearRearrangement();
    }
  });

  return null;
}
