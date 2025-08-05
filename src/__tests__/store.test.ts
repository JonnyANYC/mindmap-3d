import { useMindMapStore } from '@/lib/store'

describe('MindMapStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useMindMapStore.getState()
    store.clearMindMap()
  })

  it('should add an entry', () => {
    const store = useMindMapStore.getState()
    
    const entry = store.addEntry([1, 2, 3])
    
    expect(entry).toBeDefined()
    expect(entry.position).toEqual([1, 2, 3])
    expect(entry.summary).toBe('New Entry')
    
    // Get updated state
    const updatedState = useMindMapStore.getState()
    expect(updatedState.entries).toHaveLength(1)
    expect(updatedState.selectedEntryId).toBe(entry.id)
  })

  it('should update an entry', () => {
    const store = useMindMapStore.getState()
    
    const entry = store.addEntry()
    store.updateEntry(entry.id, {
      summary: 'Updated Entry',
      content: 'Updated content'
    })
    
    const updatedEntry = store.getEntryById(entry.id)
    expect(updatedEntry?.summary).toBe('Updated Entry')
    expect(updatedEntry?.content).toBe('Updated content')
  })

  it('should delete an entry', () => {
    const store = useMindMapStore.getState()
    
    const entry = store.addEntry()
    const entryId = entry.id
    
    store.deleteEntry(entryId)
    
    expect(store.entries).toHaveLength(0)
    expect(store.getEntryById(entryId)).toBeUndefined()
    expect(store.selectedEntryId).toBeNull()
  })

  it('should add a connection between entries', () => {
    const store = useMindMapStore.getState()
    
    const entry1 = store.addEntry([0, 0, 0])
    const entry2 = store.addEntry([1, 1, 1])
    
    const connection = store.addConnection(entry1.id, entry2.id)
    
    expect(connection).toBeDefined()
    expect(connection?.sourceId).toBe(entry1.id)
    expect(connection?.targetId).toBe(entry2.id)
    
    // Get updated state
    const updatedState = useMindMapStore.getState()
    expect(updatedState.connections).toHaveLength(1)
  })

  it('should not allow duplicate connections', () => {
    const store = useMindMapStore.getState()
    
    const entry1 = store.addEntry()
    const entry2 = store.addEntry()
    
    const connection1 = store.addConnection(entry1.id, entry2.id)
    const connection2 = store.addConnection(entry1.id, entry2.id)
    
    expect(connection1).toBeDefined()
    expect(connection2).toBeNull()
    
    // Get updated state
    const updatedState = useMindMapStore.getState()
    expect(updatedState.connections).toHaveLength(1)
  })

  it('should toggle connections', () => {
    const store = useMindMapStore.getState()
    
    const entry1 = store.addEntry()
    const entry2 = store.addEntry()
    
    // Add connection
    store.toggleConnection(entry1.id, entry2.id)
    let updatedState = useMindMapStore.getState()
    expect(updatedState.connections).toHaveLength(1)
    
    // Remove connection
    store.toggleConnection(entry1.id, entry2.id)
    updatedState = useMindMapStore.getState()
    expect(updatedState.connections).toHaveLength(0)
  })

  it('should load a mind map', () => {
    const store = useMindMapStore.getState()
    
    const mindMapData = {
      id: 'test-id',
      name: 'Test Mind Map',
      entries: [{
        id: 'entry-1',
        position: [0, 0, 0] as [number, number, number],
        summary: 'Test Entry',
        content: 'Test content',
        color: '#4CAF50',
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    store.loadMindMap(mindMapData)
    
    // Get updated state
    const updatedState = useMindMapStore.getState()
    expect(updatedState.mindMapId).toBe('test-id')
    expect(updatedState.entries).toHaveLength(1)
    expect(updatedState.entries[0].summary).toBe('Test Entry')
  })
})