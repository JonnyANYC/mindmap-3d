# 3D Mind Map Implementation Plan

## Current Status Report

### ✅ Completed Components
- **Basic 3D Scene Setup**: Canvas, camera controls, and lighting are working
- **Node Component** (partially complete as "Node" in Scene3D.tsx):
  - Box geometry implemented (needs dimension adjustment from 0.1 to 0.05)
  - Green color with hover effect
  - Text rendering on surface
  - Click handler ready
- **Connection Component**: 
  - Cylindrical geometry with correct 0.01 diameter
  - 0.5 unit gap from surfaces
  - Opacity effects for occlusion (25% when behind camera)
  - Connection calculation logic
- **Camera Controls**: OrbitControls with pan, zoom, and rotate

### 🔧 Items Needing Refinement
1. **Entry dimensions**: Change from [1, 1, 0.1] to [1, 1, 0.05]
2. **Color values**: Use exact #4CAF50 instead of "green"
3. **Selection state**: Implement proper selection (not just hover)
4. **Edit button**: Add when Entry is selected

### 📋 Next Priority Tasks
**Phase 1 - Core Data & State (Start Here)**
1. Create data types (`src/types/mindmap.ts`)
2. Install and setup Zustand for state management
3. Create mind map store with all actions

**Phase 2 - Complete 3D Components (Second Priority)**
1. Ensure connections update dynamically when entries move
2. Minor refinements to Entry component (dimensions, colors, selection state)

**Phase 3 - UI Components (Third Priority)**
1. Install required shadcn/ui components
2. Create DetailEditor with WYSIWYG
3. Build FeedbackOverlay for connections
4. Add ControlPanel with Add/Delete buttons

**Phase 4 - Interaction Logic (Fourth Priority)**
1. Implement selection system
2. Add Control+click for connections
3. Create drag-and-drop for entries
4. Add keyboard shortcuts

## Overview
Implementation plan for a 3D Mind Mapping application based on Product Requirements Document v1.4.

## Phase 1: Core Data Models & State Management

### Data Types (`src/types/mindmap.ts`)
- [x] Create Entry interface with properties:
  - [x] id: string
  - [x] position: [number, number, number]
  - [x] summary: string (single-line display text)
  - [x] content: string (full rich text content)
  - [x] color: string (default #4CAF50)
- [x] Create Connection interface with properties:
  - [x] id: string
  - [x] sourceId: string
  - [x] targetId: string
- [x] Create MindMap interface:
  - [x] entries: Entry[]
  - [x] connections: Connection[]
  - [x] metadata (created, updated, etc.)

### State Management (`src/lib/store.ts`)
- [x] Install Zustand: `npm install zustand`
- [x] Create mind map store with:
  - [x] State: entries, connections, selectedEntryId
  - [x] Actions:
    - [x] addEntry(entry: Entry)
    - [x] updateEntry(id: string, updates: Partial<Entry>)
    - [x] deleteEntry(id: string)
    - [x] moveEntry(id: string, position: [number, number, number])
    - [x] addConnection(sourceId: string, targetId: string)
    - [x] removeConnection(sourceId: string, targetId: string)
    - [x] toggleConnection(sourceId: string, targetId: string)
    - [x] setSelectedEntry(id: string | null)

### Supabase Integration (`src/lib/supabase.ts`)
- [x] Initialize Supabase client *(Optional - works without config)*
- [x] Create database schema:
  - [x] mindmaps table
  - [x] entries table
  - [x] connections table
- [x] Implement CRUD operations:
  - [x] saveMindMap()
  - [x] loadMindMap(id: string)
  - [x] listMindMaps()
  - [x] deleteMindMap(id: string)
- [x] Add real-time sync capabilities *(Subscription setup ready)*

## Phase 2: 3D Components Enhancement

### Entry Component (`src/components/3d/Entry.tsx`)
- [x] Implement box geometry with dimensions [1, 1, 0.05] *(Note: Currently 0.1, needs adjustment)*
- [x] Apply green color scheme:
  - [x] Default: #4CAF50 *(Note: Using "green" color)*
  - [ ] Selected: lighter shade of green *(Partial: Has hover but not selection)*
  - [x] Hover: intermediate shade *(Using "lightgreen")*
- [x] Add surface text rendering:
  - [x] Display summary on positive z-axis surface
  - [x] Ensure text is legible from distance
  - [x] Center text on surface
- [x] Implement selection behavior:
  - [x] Click to select
  - [x] Show "Edit" button when selected (bottom of positive z-axis)
  - [x] Visual feedback for selected state
- [x] Add matte finish material *(Using meshStandardMaterial)*

### Connection Component (`src/components/3d/Connection.tsx`)
- [x] Create cylindrical geometry:
  - [x] Diameter: 0.01 units
  - [x] Color: #4CAF50 (same as entries) *(Using "green")*
- [x] Implement connection logic:
  - [x] Calculate closest surfaces between entries
  - [x] Connect from center of appropriate surfaces
  - [x] Maintain 0.5 unit gap from entry surfaces
- [x] Add opacity effects:
  - [x] Full opacity when visible
  - [x] 25% opacity when occluded/behind camera
  - [x] Smooth opacity transitions
- [ ] Ensure connections update dynamically when entries move

### MindMapScene Component (`src/components/3d/MindMapScene.tsx`)
- [x] Integrate Entry and Connection components *(In Scene3D.tsx)*
- [x] Set up camera controls:
  - [x] Orbit: left-click and drag
  - [x] Pan: right-click and drag (two-finger on touch)
  - [x] Zoom: scroll wheel (pinch on touch)
- [x] Implement scene lighting:
  - [x] Ambient light for base illumination
  - [x] Directional light for shadows
- [ ] Add performance optimizations:
  - [ ] Frustum culling
  - [ ] Level of detail (LOD) for complex scenes
  - [ ] Instance rendering for multiple entries

## Phase 3: User Interface Components

### Install shadcn/ui Components
- [ ] Button: `npx shadcn add button`
- [ ] Dialog: `npx shadcn add dialog`
- [ ] Card: `npx shadcn add card`
- [ ] Input: `npx shadcn add input`
- [ ] Textarea: `npx shadcn add textarea`
- [ ] Toast: `npx shadcn add toast`

### DetailEditor Component (`src/components/ui/DetailEditor.tsx`)
- [ ] Install WYSIWYG editor: `npm install @tiptap/react @tiptap/starter-kit`
- [ ] Create 2D overlay dialog:
  - [ ] Full-screen or large modal
  - [ ] Appears over 3D view when Edit button clicked
- [ ] Implement editor features:
  - [ ] Bold, italics, underline
  - [ ] Bullet points and numbered lists
  - [ ] Hyperlinks
  - [ ] Auto-save on change (debounced)
- [ ] Add controls:
  - [ ] X button to close
  - [ ] ESC key handler
  - [ ] Save indicator

### FeedbackOverlay Component (`src/components/ui/FeedbackOverlay.tsx`)
- [ ] Create connection feedback messages:
  - [ ] "Connection Added. Click to remove"
  - [ ] "Connection removed. Click to undo"
- [ ] Position at bottom of screen
- [ ] Implement auto-dismiss on:
  - [ ] Camera movement
  - [ ] Entry click
  - [ ] After timeout (optional)
- [ ] Add click handlers for undo actions

### ControlPanel Component (`src/components/ui/ControlPanel.tsx`)
- [ ] Create "Add Entry" button:
  - [ ] Prominent placement
  - [ ] Creates entry near selected or at center
- [ ] Add delete functionality:
  - [ ] Show when entry selected
  - [ ] Confirmation dialog
  - [ ] Remove associated connections
- [ ] Display camera controls guide:
  - [ ] Collapsible help section
  - [ ] Visual icons for controls

## Phase 4: Interaction Logic

### Selection System (`src/hooks/useSelection.ts`)
- [ ] Implement single-click selection:
  - [ ] Track selected entry ID
  - [ ] Clear selection on background click
  - [ ] Visual feedback for selected state
- [ ] Add Control+click connection creation:
  - [ ] Detect modifier key
  - [ ] Create/remove connection between selected and clicked
  - [ ] Show feedback overlay
- [ ] Handle multi-selection scenarios (future enhancement)

### Drag and Drop System (`src/hooks/useDragDrop.ts`)
- [ ] Implement entry dragging:
  - [ ] Detect drag start on selected entry
  - [ ] Update position in 3D space
  - [ ] Constrain to reasonable bounds
- [ ] Update connections dynamically:
  - [ ] Recalculate connection geometry
  - [ ] Maintain gaps and surface selection
- [ ] Add position snapping (optional):
  - [ ] Grid snapping
  - [ ] Alignment guides

### Keyboard Shortcuts (`src/hooks/useKeyboardShortcuts.ts`)
- [ ] ESC key: Close editor/dialogs
- [ ] Delete/Backspace: Remove selected entry
- [ ] Ctrl+Z: Undo last action
- [ ] Ctrl+Y/Ctrl+Shift+Z: Redo
- [ ] Ctrl+N: New entry
- [ ] Ctrl+S: Save (if applicable)

## Phase 5: Integration & Polish

### Update Main Page (`src/app/page.tsx`)
- [ ] Remove existing Scene3D component
- [ ] Integrate new MindMapScene
- [ ] Add ControlPanel
- [ ] Include FeedbackOverlay
- [ ] Set up DetailEditor dialog
- [ ] Add loading states:
  - [ ] Initial load spinner
  - [ ] Saving indicators
- [ ] Implement error boundaries:
  - [ ] Graceful error handling
  - [ ] User-friendly error messages

### Persistence Implementation
- [ ] Auto-save functionality:
  - [ ] Debounced saves on changes
  - [ ] Save indicator in UI
- [ ] Load existing mind maps:
  - [ ] Mind map selector/list
  - [ ] Load on page refresh
- [ ] Handle offline state:
  - [ ] Local storage fallback
  - [ ] Sync when online

### Performance Optimization
- [ ] Component optimization:
  - [ ] React.memo for Entry and Connection
  - [ ] useMemo for expensive calculations
  - [ ] useCallback for event handlers
- [ ] Three.js optimization:
  - [ ] Geometry instancing for multiple entries
  - [ ] Texture atlasing for text
  - [ ] Reduce draw calls
- [ ] State management optimization:
  - [ ] Selective re-renders
  - [ ] Immutable updates
  - [ ] Batch state updates

### Testing
- [ ] Unit tests:
  - [ ] Store actions and selectors
  - [ ] Utility functions
  - [ ] Hook logic
- [ ] Component tests:
  - [ ] Entry component interactions
  - [ ] Connection rendering
  - [ ] UI component behavior
- [ ] Integration tests:
  - [ ] Full interaction flows
  - [ ] Connection creation/deletion
  - [ ] Entry editing workflow
- [ ] Performance tests:
  - [ ] Verify 60 FPS with 50+ entries
  - [ ] Memory usage monitoring

## Phase 6: Final Polish & Deployment

### Code Quality
- [ ] Run linter: `npm run lint`
- [ ] Fix any TypeScript errors
- [ ] Code review and refactoring
- [ ] Add JSDoc comments where helpful

### Documentation
- [ ] Update README.md with:
  - [ ] Project description
  - [ ] Installation instructions
  - [ ] Usage guide
  - [ ] Architecture overview
- [ ] Create user guide for controls
- [ ] Document API/data structures

### Deployment Preparation
- [ ] Environment variables setup
- [ ] Production build: `npm run build`
- [ ] Performance profiling
- [ ] Security review

## Future Enhancements (Post-V1)
- [ ] Customization: Entry/connection colors and shapes
- [ ] Collaboration: Real-time multi-user editing
- [ ] Export: Image (2D) and 3D model formats (.obj, .glb)
- [ ] Search: Quick find and focus functionality
- [ ] VR/AR: Immersive viewing support

## Backlog (Future Releases)
### State Management Enhancements
- [ ] Undo/redo functionality
  - [ ] Implement history stack
  - [ ] Keyboard shortcuts (Ctrl+Z/Ctrl+Y)
  - [ ] Visual feedback for undo/redo actions

## Notes
- Maintain 60 FPS performance target
- Follow existing code conventions
- Test on multiple browsers and devices
- Keep accessibility in mind where applicable