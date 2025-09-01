// Core rearrangement algorithm shared between main thread and Web Worker
// This file contains the algorithm logic without any imports or TypeScript types

const BOUNDING_SPHERE_RADIUS = 5;
const REPULSION_STRENGTH = 1.0;
const ATTRACTION_STRENGTH = 0.05;
const DAMPING_FACTOR = 0.9;
const MAX_SPEED = 0.5;
const ITERATIONS = 100;
const MIN_DISTANCE_FROM_ROOT = 1.5;

// Vector3 utility class
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const length = this.length();
    if (length === 0) return this;
    return this.multiplyScalar(1 / length);
  }
}

// Core algorithm functions
const RearrangementCore = {
  calculateRearrangedPositions(rootEntry, children, onProgress) {
    const newPositions = new Map();
    const velocities = new Map();

    // Initialize positions and velocities
    const rootPosition = new Vector3(...rootEntry.position);
    children.forEach((child, index) => {
      // Use spherical coordinates for better initial distribution
      const phi = Math.acos(1 - 2 * (index + 0.5) / children.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      
      const offset = new Vector3(x, y, z).multiplyScalar(BOUNDING_SPHERE_RADIUS * 0.8);
      const initialPos = rootPosition.clone().add(offset);
      
      newPositions.set(child.id, [initialPos.x, initialPos.y, initialPos.z]);
      velocities.set(child.id, new Vector3());
    });

    for (let i = 0; i < ITERATIONS; i++) {
      if (onProgress) {
        onProgress((i + 1) / ITERATIONS);
      }
      
      children.forEach(child => {
        const childPosition = new Vector3(...newPositions.get(child.id));
        const childVelocity = velocities.get(child.id);

        // Attraction force towards the root
        const rootPosition = new Vector3(...rootEntry.position);
        const attractionForce = rootPosition.clone().sub(childPosition).multiplyScalar(ATTRACTION_STRENGTH);

        // Repulsion forces from other children
        const repulsionForce = new Vector3();
        children.forEach(otherChild => {
          if (child.id !== otherChild.id) {
            const otherPosition = new Vector3(...newPositions.get(otherChild.id));
            const direction = childPosition.clone().sub(otherPosition);
            const distance = direction.length();
            if (distance > 0) {
              const force = direction.normalize().multiplyScalar(REPULSION_STRENGTH / (distance * distance));
              repulsionForce.add(force);
            }
          }
        });

        // Repulsion force from the root entry itself
        const rootRepulsionDirection = childPosition.clone().sub(rootPosition);
        const rootDistance = rootRepulsionDirection.length();
        if (rootDistance > 0) {
          const rootRepulsionForce = rootRepulsionDirection.normalize().multiplyScalar(REPULSION_STRENGTH / (rootDistance * rootDistance));
          repulsionForce.add(rootRepulsionForce);
        }

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

    // Constrain to bounding sphere and enforce minimum distance from root
    children.forEach(child => {
      const childPosition = new Vector3(...newPositions.get(child.id));
      const rootPosition = new Vector3(...rootEntry.position);
      const direction = childPosition.clone().sub(rootPosition);
      const distance = direction.length();
      
      // Enforce minimum distance from root
      if (distance < MIN_DISTANCE_FROM_ROOT) {
        if (distance === 0) {
          const defaultOffset = new Vector3(MIN_DISTANCE_FROM_ROOT, 0, 0);
          const newPos = new Vector3(
            rootPosition.x + defaultOffset.x,
            rootPosition.y + defaultOffset.y,
            rootPosition.z + defaultOffset.z
          );
          newPositions.set(child.id, [newPos.x, newPos.y, newPos.z]);
        } else {
          const newPos = new Vector3(
            rootPosition.x + direction.x / distance * MIN_DISTANCE_FROM_ROOT,
            rootPosition.y + direction.y / distance * MIN_DISTANCE_FROM_ROOT,
            rootPosition.z + direction.z / distance * MIN_DISTANCE_FROM_ROOT
          );
          newPositions.set(child.id, [newPos.x, newPos.y, newPos.z]);
        }
      }
      // Constrain to bounding sphere
      else if (distance > BOUNDING_SPHERE_RADIUS) {
        const newPos = new Vector3(
          rootPosition.x + direction.x / distance * BOUNDING_SPHERE_RADIUS,
          rootPosition.y + direction.y / distance * BOUNDING_SPHERE_RADIUS,
          rootPosition.z + direction.z / distance * BOUNDING_SPHERE_RADIUS
        );
        newPositions.set(child.id, [newPos.x, newPos.y, newPos.z]);
      }
    });

    return newPositions;
  },

  calculateSimplifiedPositions(rootEntry, children) {
    const newPositions = new Map();
    const rootPosition = new Vector3(...rootEntry.position);
    const distance = 5;

    const axes = ['x', 'y', 'z'];
    const signs = [1, -1];
    let axisIndex = 0;
    let signIndex = 0;

    children.forEach(child => {
      const offset = new Vector3();
      const axis = axes[axisIndex];
      const sign = signs[signIndex];

      // Use explicit property assignment
      if (axis === 'x') {
        offset.x = distance * sign;
      } else if (axis === 'y') {
        offset.y = distance * sign;
      } else if (axis === 'z') {
        offset.z = distance * sign;
      }

      const newPos = new Vector3(
        rootPosition.x + offset.x,
        rootPosition.y + offset.y,
        rootPosition.z + offset.z
      );
      newPositions.set(child.id, [newPos.x, newPos.y, newPos.z]);

      // Cycle through axes and signs
      signIndex++;
      if (signIndex >= signs.length) {
        signIndex = 0;
        axisIndex++;
        if (axisIndex >= axes.length) {
          axisIndex = 0;
        }
      }
    });

    return newPositions;
  },

  rearrangeMindMap(rootEntry, entries, connections, onProgress) {
    const allNewPositions = new Map();
    const rearrangedEntries = new Set();
    const localEntries = JSON.parse(JSON.stringify(entries));
    const startTime = performance.now();
    const isLargeMindMap = entries.length > 100;

    function getChildren(entryId) {
      const childrenIds = connections
        .filter(c => c.sourceId === entryId || c.targetId === entryId)
        .map(c => c.sourceId === entryId ? c.targetId : c.sourceId);
      return localEntries.filter(e => childrenIds.includes(e.id) && !rearrangedEntries.has(e.id));
    }

    // Count descendants for an entry (excluding already rearranged ones)
    function countDescendants(entryId, visited = new Set()) {
      if (visited.has(entryId) || rearrangedEntries.has(entryId)) {
        return 0;
      }
      visited.add(entryId);
      
      const children = getChildren(entryId);
      let count = children.length;
      
      for (const child of children) {
        count += countDescendants(child.id, visited);
      }
      
      return count;
    }

    function rearrange(currentEntry) {
      if (rearrangedEntries.has(currentEntry.id)) {
        return;
      }
      rearrangedEntries.add(currentEntry.id);

      const children = getChildren(currentEntry.id);
      if (children.length === 0) {
        return;
      }

      const newChildPositions =
        children.length <= 6
          ? RearrangementCore.calculateSimplifiedPositions(currentEntry, children)
          : RearrangementCore.calculateRearrangedPositions(currentEntry, children, (progress) => {
              if (onProgress) {
                const totalProgress = (rearrangedEntries.size + progress) / entries.length;
                onProgress(totalProgress);
              }
            });

      newChildPositions.forEach((pos, id) => {
        const entryToUpdate = localEntries.find(e => e.id === id);
        if (entryToUpdate) {
          entryToUpdate.position = pos;
        }
        allNewPositions.set(id, pos);
      });

      // Sort children by descendant count (most descendants first)
      // Skip this optimization for very large mind maps if it affects performance
      let sortedChildren = children;
      if (!isLargeMindMap || (performance.now() - startTime) < 1000) {
        const childrenWithDescendants = children.map(child => ({
          entry: child,
          descendantCount: countDescendants(child.id)
        }));
        
        sortedChildren = childrenWithDescendants
          .sort((a, b) => b.descendantCount - a.descendantCount)
          .map(item => item.entry);
      }

      sortedChildren.forEach(child => {
        const updatedChild = localEntries.find(e => e.id === child.id);
        if (updatedChild) {
          rearrange(updatedChild);
        }
      });
    }

    rearrange(rootEntry);
    return { newPositions: allNewPositions, updatedEntries: localEntries };
  }
};

// Export for Node.js/CommonJS environments (for use in main thread)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RearrangementCore;
}

// Make available globally for Web Worker
if (typeof self !== 'undefined') {
  self.RearrangementCore = RearrangementCore;
}