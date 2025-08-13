import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Entry as EntryType } from '@/types/mindmap'
import { useMindMapStore } from '@/lib/store'
import { Canvas } from '@react-three/fiber'

jest.mock('@/lib/store', () => ({
  useMindMapStore: jest.fn()
}))

const TestEntry = ({ entry }: { entry: EntryType }) => {
  const { openEditor } = useMindMapStore(state => ({ openEditor: state.openEditor }))
  return (
    <mesh onClick={() => openEditor(entry.id)}>
      <boxGeometry args={[1, 1, 0.05]} />
      <meshStandardMaterial />
    </mesh>
  )
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Canvas>
    {children}
  </Canvas>
)

describe('Entry Component', () => {
  const mockEntry: EntryType = {
    id: 'test-entry-1',
    position: [0, 0, 0],
    summary: 'Test Entry',
    content: 'Test content',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockOpenEditor = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useMindMapStore as unknown as jest.Mock).mockImplementation(selector => selector({ openEditor: mockOpenEditor }))
  })

  it('opens editor when clicked', () => {
    const { container } = render(
      <TestWrapper>
        <TestEntry entry={mockEntry} />
      </TestWrapper>
    )

    const mesh = container.querySelector('mesh')
    mesh?.props.onClick()

    expect(mockOpenEditor).toHaveBeenCalledWith(mockEntry.id)
  })
})
