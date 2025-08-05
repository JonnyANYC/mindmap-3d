# 3D Mind Map Implementation Plan

## Phase 1: Core UI Components & Basic Setup
### 1.1 Install Required Dependencies
- [x] Install additional UI components from shadcn/ui (Dialog, Button, etc.) ✓
- [x] Install any missing type definitions ✓

### 1.2 Update Entry Component
- [x] Add text display on both z-axis surfaces (positive and negative) ✓
- [x] Implement proper text rendering with legibility ✓
- [x] Add Edit button placeholder that appears on selected entries ✓
- [x] Style entry boxes with proper dimensions and matte finish ✓

## Phase 2: Enhanced 3D Visualization
### 2.1 Remove Grid and Update Scene
- [x] Remove grid from 3D scene (already has Grid component to remove) ✓
- [x] Update background and lighting for better visualization ✓
- [x] Remove or update ground plane as needed ✓

### 2.2 Improve Connection Rendering
- [x] Update connection cylinder implementation to properly calculate z-axis surfaces ✓
- [x] Implement smart connection point selection (closest surfaces) ✓
- [x] Ensure 0.5 unit gap from entry surfaces ✓
- [x] Fine-tune opacity transitions for occluded connections ✓

## Phase 3: User Interaction Features
### 3.1 Add Entry Button & Creation Logic
- [x] Create "Add Entry" button in UI ✓
- [x] Implement smart positioning logic: ✓
  - If selected entry exists and camera > 3 units away: place halfway ✓
  - Otherwise: place 3 units in front of camera ✓
- [x] Auto-select newly created entries ✓
- [x] Fix Entry selection click handling ✓
  - Fixed Text elements blocking clicks on Entry boxes
  - Fixed Canvas onClick immediately deselecting entries

### 3.2 Connection Management
- Implement Ctrl+Click connection toggle functionality
- Create connection feedback overlays ("Connection Added/Removed")
- Add undo/redo functionality for connection operations
- Implement overlay dismissal on camera movement or entry clicks

### 3.3 Entry Movement System
- Add drag detection on selected entries
- Implement perpendicular plane movement (normal drag)
- Implement depth movement (Shift+drag)
- Add visual feedback:
  - 75% opacity at original position
  - 25% opacity ghost at new position
  - Cursor changes (4-way and 2-way arrows)
- Disable camera controls during movement
- Add ESC key cancellation
- Update connections after successful moves

### 3.4 Delete Entry Functionality
- Add delete option for selected entries
- Implement cascade deletion of connected connections
- Add confirmation or undo option

## Phase 4: WYSIWYG Editor Implementation
### 4.1 Install WYSIWYG Dependencies
- Install WYSIWYG editor (Tiptap recommended for React compatibility)

### 4.2 Implement WYSIWYG Editor Component
- Create `src/components/Editor/WYSIWYGEditor.tsx`
- Implement rich text editing features (bold, italic, underline, lists, links)
- Add auto-save functionality
- Create editor dialog/overlay component
- Connect Edit button to open WYSIWYG editor

## Phase 5: State Management & Persistence
### 5.1 Extend Zustand Store
- Add editor state management
- Add connection toggle history for undo
- Add entry movement state
- Add UI overlay state management

### 5.2 Supabase Integration
- Design database schema for entries and connections
- Implement real-time sync
- Add user authentication
- Create save/load functionality

## Phase 6: UI Polish & Controls
### 6.1 Update Help Overlay
- Style help overlay in lower-left corner
- Add semi-transparent background
- Include all control instructions
- Add dynamic position indicators

### 6.2 Keyboard Shortcuts
- Implement ESC key for closing editor
- Implement ESC key for canceling movement
- Add other helpful shortcuts (Delete key, etc.)

## Phase 7: Performance & Testing
### 7.1 Performance Optimization
- Implement frustum culling for entries
- Optimize connection rendering
- Add level-of-detail for distant entries
- Ensure 60 FPS with 50+ entries

### 7.2 Testing
- Write unit tests for store actions
- Write component tests for Entry and Connection
- Test editor integration
- Test touch device support
- Performance testing with many entries

## Phase 8: Camera Position Indicators
### 8.1 Camera Position Indicators
- Create dynamic camera position tracking
- Implement arrow indicators pointing to z-axis and y-axis planes
- Add distance calculations to origin planes
- Update help overlay with dynamic position information

## Implementation Order
1. **Week 1**: Phase 1 (Basic Setup) + Phase 2 (Visual updates)
2. **Week 2**: Phase 3.1-3.2 (Add Entry + Connections)
3. **Week 3**: Phase 3.3-3.4 (Movement + Delete)
4. **Week 4**: Phase 4 (WYSIWYG Editor)
5. **Week 5**: Phase 5 (State & Persistence)
6. **Week 6**: Phase 6 (UI Polish) + Phase 7 (Performance & Testing)
7. **Week 7**: Phase 8 (Camera Position Indicators)

## Key Technical Decisions
- Use Tiptap for WYSIWYG editor (better React integration)
- Use Zustand for complex state management (already in place)
- Use React Three Fiber's useFrame for performance-critical updates
- Implement custom cursor management for drag operations
- Use Supabase real-time subscriptions for future collaboration