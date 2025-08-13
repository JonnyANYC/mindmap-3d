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
### 6.1 improve the overall layout
 - the canvas should use all of the visible space. It has a fixed height. make the help overlay appear on top of the canvas  
 - Put the Add Entry button somewhere useful and more prominent. 
 
### 6.2 Update Help Overlay
- Style help overlay in lower-left corner
- Add semi-transparent background
- Include all control instructions
- Add dynamic position indicators

### 6.3 Keyboard Shortcuts
- Implement ESC key for closing editor
- Implement ESC key for canceling movement
- Add other helpful shortcuts (Delete key, etc.). Do not list any of these additional shortcuts on the Help Overlay.
- Define an additional keyboard shortcut of "?", which will display a fairly large centered modal overlay that lists *all* keyboard schortcuts, including the new ones defined in the previous task. The new "?" keyboard shortcut and the "F" shortcut should be added to the Help Overlay. This extended Help modal overlay should have an "X" close control in the upper right, but it should be closable by typing Esc or by clicking any area outside the modal. All other keyboard shortcuts should be disabled while the extended Help modal overlay is displayed. The rest of the canvas should have reduced visibility until the modal is dismissed.

### 6.4 Additional UI improvements
- Can the app detect when it is running in a touch environment vs. a mouse environment? if so, then list the touch controls in the Help Overlay only when the app is running in a touch environment, and hide the touch controls when running in a mouse environment. If the app can detect when it is running in both a touch and mouse environment at the same time, then display suppress the keyboard / mouse controls when running in a touch-only environment, and show both sets of controls when running in a touch and mouse environment.
- add the option to collapse the Help Overlay to the bottom of the screen. In that state, only the header "3D Mind Map controls" should be visible, plus the control to expand the Help Overlay. Display the Help Overlay expanded by default with a new Mind Map, but remember the setting when the Mind Map state is saved. If an existing Mind Map is loaded, use this setting to determine the state of the Help Overlay. If an existing Mind Map is loaded but it doesn't indicate the open vs. collapsed state for the Help Overlay, then default to the opened state.

## 6.7 Local storage mode
- Update the state functionality to use local browser storage whenever Supabase is unavailable. support all of the same functionality as with Supabase, but skip any login / auth functionality. In this scenario. also indicate on the splash page that cloud storage is unavailable and so Mind Maps will be saved to local storage.
- At app startup, if Supabase is unavailable, then check local browser storage for existing Mind Maps.
- If Supabase is unavailable and local browser storage is also unavailable, then indicate on the splash page that the app is in offline mode, and work will be stored locally, and only for the current browser session.

## Phase 7: Performance & Testing
### 7.1 Performance Optimization
- Implement frustum culling for entries
- Optimize connection rendering
- Add level-of-detail for distant entries
- Ensure 60 FPS with 50+ entries

### 7.2 Testing ✓
- [x] Write unit tests for store actions ✓
- [x] Write component tests for Entry and Connection ✓
- [x] Test editor integration ✓
- [x] Test touch device support ✓
- [x] Performance testing with many entries ✓

## Phase 8: Re-arrange all Entries in the graph around a selected central / root Entry

### 8.1 Root entry
- One entry in the mind map is designated as the root entry. this is the first entry by default, but the user is able to press a button in the edit overlay to identify a new root entry. Exactly one entry is the root entry, so when a new root entry is chosen, the existing one is no longer the root entry.

### 8.2 Force-directed re-arranging of a single entry and its children
- The user has the option to re-arrange the children of the root entry. This is a temporary feature to test the approach. when Control+Shift+R is pressed, all of the children of the current root entry are repositioned within a bounding sphere of distance 5 from the root entry. force-directed spacing is used, with entries repelling each other and connections keeping everything constrained. the children should start near the edge of the bounding sphere, and then use force-directed spacing to find an equilibrium state. for now the entries can be simply moved from their existing position to their new position. no need yet for an animation as part of the move.
- When the children of the root entry are re-arranged, the movement should be animated to maintain continuity. directly update the position property of the 3D objects (entries and connections) rather than re-rendering entire components. The animation loop should use requestAnimationFrame for smooth, browser-optimized rendering. the children should move into their new location over the course of a second.
- perform a simplified re-arranging if the root entry has 6 or fewer children -- in this scenario, simply move each child to be 5 units from the root entry, in one of the 3 axes. in other words, position the children at a distance of -5 or +5 on the x, y, and z axes, in that order. Animate this movement a little faster since there is less activity -- within half a second if possible. 

### 8.3 Force-directed re-arranging of the entire mind map
- Expand the re-arrange action to also re-arrange the children of the first child of the root entry. And then perform the action recursively on the first child of that entry and so on, until an entry is reached that has no additional children. keep track of which entries have been re-arranged. after an entry has been re-arranged, do not re-arrange it again as part of this action. Once the re-arranging is complete, clear the memory of which entries are re-arranged, so this information does not pollute future re-arrangement requests.
- Expand the re-arrange action to cover the entire mind map -- Once re-arranging the root entry, recursively act on each child as well. keep track of which entries have been re-arranged. after an entry has been re-arranged, do not re-arrange it again as part of this action. Once the re-arranging is complete, clear the memory of which entries are re-arranged, so this information does not pollute future re-arrangement requests.

### 8.4 Optimizations to re-rrangement
- After each entry is re-arranged, temporarily calculate how many decendents are under each of its children. when choosing which child to process next, proceed in order of most decendents to least. test the performance of this optimization when it is implemented. If it slows down the re-arrangement feature too much, then disable this optimization on very large mind maps.
- Consider moving the re-arrangement computation to a Web Worker.
- Add a transient notice at the bottom of the page when a re-arrangement is complete. Indicate in the message how many wall seconds were consumed by the action, to a precision of 1 decimal place.

## Phase 9: Navigate the camera smoothly to the selected entry when the user chooses the "focus" feature.

## Phase 10: For large mind maps, dim all of the map except for the currently selected entry and its direct connections.

## Phase 11: Camera Position Indicators
### 11.1 Camera Position Indicators
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

## Baklog phase: post-launch options
### Backlog.1: UI
- if space permits, display a delete button conditionally, near the Add Entry button, whenever an Entry is seleted, and then remove it when the Entry is unselected.

### Backlog.2: Voice+AI-powered Mind Map creation

## Key Technical Decisions
- Use Tiptap for WYSIWYG editor (better React integration)
- Use Zustand for complex state management (already in place)
- Use React Three Fiber's useFrame for performance-critical updates
- Implement custom cursor management for drag operations
- Use Supabase real-time subscriptions for future collaboration