'use client'

import { useState, useEffect } from 'react'
import { useMindMapStore } from '@/lib/store'
import { mindMapSaveService } from '@/lib/mindMapService'
import { DbMindMap } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useStorage } from '@/components/StorageProvider'
import { storageService } from '@/lib/storage/storageService'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function MindMapSelector() {
  const [mindMaps, setMindMaps] = useState<DbMindMap[]>([])
  const [loading, setLoading] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const setInputFocused = useMindMapStore(state => state.setInputFocused)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { toast } = useToast()
  const { status } = useStorage()
  
  const currentMindMapId = useMindMapStore(state => state.mindMapId)
  const clearMindMap = useMindMapStore(state => state.clearMindMap)

  // Load mind maps list
  useEffect(() => {
    const loadMindMaps = async () => {
      if (!status?.isAvailable || !storageService.isPersistentStorage()) {
        // In session mode, we can't list saved maps
        setLoading(false)
        return
      }
      
      setLoading(true)
      const maps = await mindMapSaveService.list()
      setMindMaps(maps)
      setLoading(false)
    }
    
    if (status) {
      loadMindMaps()
    }
  }, [status])

  const handleLoadMindMap = async (id: string) => {
    const result = await mindMapSaveService.load(id)
    
    if (result.success) {
      toast({
        title: 'Mind map loaded',
        description: 'Your mind map has been loaded successfully',
      })
    } else {
      toast({
        title: 'Error loading mind map',
        description: result.error || 'Failed to load mind map',
        variant: 'destructive',
      })
    }
  }

  const handleCreateMindMap = async () => {
    if (!newMapName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your mind map',
        variant: 'destructive',
      })
      return
    }

    // Handle different storage modes
    if (!storageService.isPersistentStorage()) {
      // Create session-only mind map
      const store = useMindMapStore.getState()
      store.clearMindMap(newMapName)
      store.loadMindMap({
        id: `session-${Date.now()}`,
        name: newMapName,
        entries: [],
        connections: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      toast({
        title: 'Mind map created',
        description: status?.message || 'Working in session mode',
      })
      setNewMapName('')
      setIsCreateDialogOpen(false)
      return
    }

    const result = await mindMapSaveService.createNew(newMapName)
    
    if (result.id) {
      toast({
        title: 'Mind map created',
        description: 'Your new mind map has been created',
      })
      setNewMapName('')
      setIsCreateDialogOpen(false)
      // Reload mind maps
      const loadMaps = async () => {
        if (status?.isAvailable && storageService.isPersistentStorage()) {
          const maps = await mindMapSaveService.list()
          setMindMaps(maps)
        }
      }
      loadMaps()
      // Also update the store
      const store = useMindMapStore.getState()
      store.loadMindMap({
        id: result.id,
        name: newMapName,
        entries: [],
        connections: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } else {
      toast({
        title: 'Error creating mind map',
        description: result.error || 'Failed to create mind map',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteMindMap = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    const result = await mindMapSaveService.delete(id)
    
    if (result.success) {
      toast({
        title: 'Mind map deleted',
        description: 'The mind map has been deleted',
      })
      // Reload mind maps
      const loadMaps = async () => {
        if (status?.isAvailable && storageService.isPersistentStorage()) {
          const maps = await mindMapSaveService.list()
          setMindMaps(maps)
        }
      }
      loadMaps()
      // also clear the store if the deleted map was the current one
      if (currentMindMapId === id) {
        clearMindMap()
      }
    } else {
      toast({
        title: 'Error deleting mind map',
        description: result.error || 'Failed to delete mind map',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            New Mind Map
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Mind Map</DialogTitle>
            <DialogDescription>
              Enter a name for your new mind map
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateMindMap()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                className="col-span-3"
                placeholder="My Mind Map"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateMindMap}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Open Mind Map
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your Mind Maps</DialogTitle>
            <DialogDescription>
              Select a mind map to open
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : !storageService.isPersistentStorage() ? (
              <div className="text-center py-4 text-neutral-500">
                Mind map list not available in session storage mode.
              </div>
            ) : mindMaps.length === 0 ? (
              <div className="text-center py-4 text-neutral-500">
                No mind maps found. Create your first one!
              </div>
            ) : (
              <div className="space-y-2">
                {mindMaps.map((map) => (
                  <div
                    key={map.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      currentMindMapId === map.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <div>
                      <h4 className="font-medium">{map.name}</h4>
                      <p className="text-sm text-neutral-500">
                        Last updated: {new Date(map.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {currentMindMapId !== map.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadMindMap(map.id)}
                        >
                          Open
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDeleteMindMap(map.id, map.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {currentMindMapId && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearMindMap}
        >
          Close Current
        </Button>
      )}
    </div>
  )
}