export interface Entry {
  id: string
  position: [number, number, number]
  summary: string
  content: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

export interface Connection {
  id: string
  sourceId: string
  targetId: string
  createdAt: Date
}

export interface MindMap {
  id: string
  name: string
  entries: Entry[]
  connections: Connection[]
  createdAt: Date
  updatedAt: Date
}

export type Position3D = [number, number, number]

export const DEFAULT_ENTRY_COLOR = '#4CAF50'
export const SELECTED_ENTRY_COLOR = '#66BB6A'
export const HOVERED_ENTRY_COLOR = '#81C784'