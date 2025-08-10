import '@testing-library/jest-dom'

// Enable fake timers for tests
jest.useFakeTimers()

// Mock Three.js and React Three Fiber for component tests
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => children,
  useFrame: jest.fn(),
  useThree: () => ({
    camera: {},
    gl: {},
    scene: {},
    size: { width: 800, height: 600 }
  }),
  extend: jest.fn()
}))

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Text: ({ children, ...props }) => null,
  PerspectiveCamera: () => null,
  Environment: () => null
}))

// Mock WebGL context
const mockWebGLContext = {
  canvas: {},
  getParameter: jest.fn(),
  createProgram: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  getShaderParameter: jest.fn(() => true),
  getExtension: jest.fn(),
  getShaderPrecisionFormat: jest.fn(() => ({
    precision: 23,
    rangeMin: 127,
    rangeMax: 127
  }))
}

// Setup canvas mock
HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
  if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
    return mockWebGLContext
  }
  return null
})