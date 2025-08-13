### Feature Spec: Dynamic Camera Position Indicators### Feature Spec: Dynamic Camera Positio

#### 1. Feature Overview & Goal

The primary goal of this feature is to give users a constant sense of their location and orientation within the 3D space. This helps prevent disorientation and makes navigation more intuitive by displaying the camera's live coordinates relative to the scene's origin (0, 0, 0).

Based on your `PLAN.md`, this information will be integrated directly into the existing Help Overlay.

#### 2. UI/UX Specification

The position indicators should be added as a new section within the `HelpOverlay` component, which is located in the bottom-left corner of the screen.

**Display Content:**

The overlay should display the following information, updated in real-time:

*   **Camera Coordinates:** The camera's current X, Y, and Z position.
*   **Directional Labels:** Simple text labels to give context to the coordinates.
*   **Distance to Planes:** The absolute distance from the camera to each of the three major planes (XY, XZ, YZ).

**Visual Mockup (Text-based):**

Here's how the new section in the Help Overlay could look:

```
---------------------------------
| 3D Mind Map Controls          |
| ... (existing controls) ...   |
|-------------------------------|
| Camera Position               |
| X: +10.5 (Right) | d: 10.5    |
| Y: -5.2 (Bottom) | d: 5.2     |
| Z: +20.0 (Front) | d: 20.0    |
---------------------------------
```

*   **Coordinates:** Displayed with a `+` or `-` sign and rounded to one decimal place.
*   **Directional Labels:**
    *   **X-axis:** `(Right)` for positive, `(Left)` for negative.
    *   **Y-axis:** `(Top)` for positive, `(Bottom)` for negative.
    *   **Z-axis:** `(Front)` for positive, `(Back)` for negative.
*   **Distance (`d`):** The absolute distance to the corresponding plane (e.g., for X, the distance to the YZ plane).

#### 3. Technical Implementation Guide

This can be broken down into three parts: updating the state store, creating a component to track the camera, and updating the UI component to display the data.

**A. State Management (Zustand)**

The developer should extend the existing Zustand store (`useUIStore` or similar) to hold the camera's position.

*   **File:** `src/lib/store.ts` (or wherever the store is defined)
*   **Add new state:**
    ```typescript
    export interface UIState {
      // ... existing state
      cameraPosition: { x: number; y: number; z: number };
    }
    ```
*   **Add new action:**
    ```typescript
    export interface UIActions {
      // ... existing actions
      setCameraPosition: (position: { x: number; y: number; z: number }) => void;
    }
    ```
*   **Implement the action:**
    ```typescript
    // Inside create()
    setCameraPosition: (position) => set({ cameraPosition: position }),
    ```
*   **Initial state:**
    ```typescript
    // Inside create()
    cameraPosition: { x: 0, y: 0, z: 0 },
    ```

**B. Camera Tracking Component**

A new, simple component should be created to live inside the `<Canvas>`. Its sole purpose is to read the camera's position on each frame and update the Zustand store. This decouples the 3D world from the 2D UI.

*   **New File:** `src/components/scene/CameraPositionUpdater.tsx`
*   **Implementation:**
    ```tsx
    import { useFrame } from '@react-three/fiber';
    import { useUIStore } from '@/lib/store'; // Assuming store path
    import { throttle } from 'lodash'; // Or a simpler throttle function

    // Throttle the update to avoid excessive re-renders of the UI
    const updatePosition = throttle((set, pos) => set(pos), 100);

    export function CameraPositionUpdater() {
      const setCameraPosition = useUIStore((state) => state.setCameraPosition);

      useFrame(({ camera }) => {
        const { x, y, z } = camera.position;
        updatePosition(setCameraPosition, { x, y, z });
      });

      return null; // This component renders nothing
    }
    ```
*   **Usage:** The developer will add `<CameraPositionUpdater />` inside the main `<Canvas>` component in `Scene3D.tsx`.

**C. UI Display Component (`HelpOverlay.tsx`)**

The developer needs to modify the `HelpOverlay` component to subscribe to the `cameraPosition` state and render it.

*   **File:** `src/components/ui/HelpOverlay.tsx` (or similar)
*   **Implementation:**
    ```tsx
    import { useUIStore } from '@/lib/store';

    // ... inside the HelpOverlay component
    const cameraPosition = useUIStore((state) => state.cameraPosition);

    const formatCoordinate = (value: number) => {
      return (value >= 0 ? '+' : '') + value.toFixed(1);
    };

    // ... in the JSX for the component
    <div>
      <h3 className="font-bold mt-2">Camera Position</h3>
      <div className="grid grid-cols-3 gap-x-2 text-sm">
        {/* X Position */}
        <div className="col-span-2">
          X: {formatCoordinate(cameraPosition.x)} ({cameraPosition.x >= 0 ? 'Right' : 'Left'})
        </div>
        <div>| d: {Math.abs(cameraPosition.x).toFixed(1)}</div>

        {/* Y Position */}
        <div className="col-span-2">
          Y: {formatCoordinate(cameraPosition.y)} ({cameraPosition.y >= 0 ? 'Top' : 'Bottom'})
        </div>
        <div>| d: {Math.abs(cameraPosition.y).toFixed(1)}</div>

        {/* Z Position */}
        <div className="col-span-2">
          Z: {formatCoordinate(cameraPosition.z)} ({cameraPosition.z >= 0 ? 'Front' : 'Back'})
        </div>
        <div>| d: {Math.abs(cameraPosition.z).toFixed(1)}</div>
      </div>
    </div>
    ```

#### 4. Developer Checklist (Acceptance Criteria)

*   [ ] A "Camera Position" section is added to the Help Overlay UI.
*   [ ] The X, Y, and Z coordinates are displayed and update in real-time as the camera moves.
*   [ ] Coordinates are formatted to one decimal place with a leading `+` for positive values.
*   [ ] Directional labels (Top/Bottom, Left/Right, Front/Back) are displayed correctly based on the sign of the coordinate.
*   [ ] The absolute distance (`d:`) to each of the three origin planes (XY, XZ, YZ) is displayed and updates in real-time.
*   [ ] The state updates are throttled to prevent performance issues.
*   [ ] The new UI elements are styled consistently with the rest of the Help Overlay.

<!--
[PROMPT_SUGGESTION]Implement the changes to the Zustand store in `src/lib/store.ts` as described in the plan.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Create the new `CameraPositionUpdater.tsx` component.[/PROMPT_SUGGESTION]
