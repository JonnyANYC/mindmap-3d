'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useMindMapStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { storageService } from '@/lib/storage/storageService'

export function ExportButton() {
  const { toast } = useToast()
  const getMindMapData = useMindMapStore(state => state.getMindMapData)
  
  const handleExport = () => {
    try {
      const mindMapData = getMindMapData()
      const dataStr = JSON.stringify(mindMapData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const fileName = `mindmap-${mindMapData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
      
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast({
        title: 'Mind map exported',
        description: `Saved as ${fileName}`,
      })
    } catch (error) {
      console.error('Export failed:', error)
      toast({
        title: 'Export failed',
        description: 'Could not export the mind map',
        variant: 'destructive',
      })
    }
  }
  
  // Only show export button in session storage mode
  if (storageService.getMode() !== 'session') {
    return null
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleExport}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export
    </Button>
  )
}