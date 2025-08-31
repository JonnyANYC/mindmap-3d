import { useCallback, useRef } from 'react'
import type { Entry, Connection, Position3D } from '@/types/mindmap'

interface RearrangementResult {
  newPositions: Record<string, Position3D>
  updatedEntries: Entry[]
}

export function useRearrangementWorker() {
  const workerRef = useRef<Worker | null>(null)
  const isWorkingRef = useRef(false)

  const initWorker = useCallback(() => {
    if (!workerRef.current && typeof window !== 'undefined') {
      workerRef.current = new Worker('/rearrangement-worker.js')
    }
  }, [])

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    isWorkingRef.current = false
  }, [])

  const rearrangeWithWorker = useCallback(
    (
      rootEntry: Entry,
      entries: Entry[],
      connections: Connection[],
      onProgress?: (progress: number) => void,
      onComplete?: (result: RearrangementResult) => void,
      onError?: (error: string) => void
    ) => {
      if (isWorkingRef.current) {
        onError?.('Rearrangement is already in progress')
        return
      }

      initWorker()
      
      if (!workerRef.current) {
        onError?.('Failed to initialize worker')
        return
      }

      isWorkingRef.current = true

      const worker = workerRef.current

      worker.onmessage = (e) => {
        const { type, progress, result, error } = e.data

        switch (type) {
          case 'progress':
            onProgress?.(progress)
            break
          case 'complete':
            isWorkingRef.current = false
            // Convert result back to Map format
            const newPositions = new Map<string, Position3D>()
            Object.entries(result.newPositions).forEach(([id, pos]) => {
              newPositions.set(id, pos as Position3D)
            })
            onComplete?.({
              newPositions: result.newPositions,
              updatedEntries: result.updatedEntries
            })
            break
          case 'error':
            isWorkingRef.current = false
            onError?.(error)
            break
        }
      }

      worker.onerror = (error) => {
        isWorkingRef.current = false
        onError?.(`Worker error: ${error.message}`)
      }

      // Send the rearrangement task to the worker
      worker.postMessage({
        type: 'rearrange',
        data: {
          rootEntry,
          entries,
          connections
        }
      })
    },
    [initWorker]
  )

  return {
    rearrangeWithWorker,
    terminateWorker,
    isWorking: () => isWorkingRef.current
  }
}