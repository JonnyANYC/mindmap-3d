import '@testing-library/jest-dom'

// Mock PointerEvent
if (typeof PointerEvent === 'undefined') {
  global.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, params) {
      super(type, params)
    }
  }
}

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock @react-three/fiber
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="mock-canvas">{children}</div>,
  useThree: () => ({
    camera: {
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      lookAt: jest.fn(),
    },
    scene: {
      children: [],
    },
    raycaster: {
      setFromCamera: jest.fn(),
      intersectObjects: jest.fn(() => []),
    },
    gl: {
      domElement: document.createElement('canvas'),
    },
    size: { width: 800, height: 600 },
  }),
  useFrame: jest.fn((callback) => {
    // Simulate a single frame update for tests that rely on it
    callback({
      camera: {
        position: { x: 0, y: 0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        lookAt: jest.fn(),
      },
      scene: {
        children: [],
      },
      raycaster: {
        setFromCamera: jest.fn(),
        intersectObjects: jest.fn(() => []),
      },
      gl: {
        domElement: document.createElement('canvas'),
      },
      size: { width: 800, height: 600 },
    }, 0.016); // Pass a delta time
  }),
}));

// Mock @react-three/drei
jest.mock('@react-three/drei', () => ({
  OrbitControls: ({ children }) => <div data-testid="mock-orbit-controls">{children}</div>,
  PerspectiveCamera: ({ children }) => <div data-testid="mock-perspective-camera">{children}</div>,
  Text: ({ children, ...props }) => <div data-testid="mock-text" {...props}>{children}</div>,
  Cylinder: ({ children, ...props }) => <div data-testid="mock-cylinder" {...props}>{children}</div>,
  // Mock other Drei components as needed
}));

// Mock three for specific classes if directly used
jest.mock('three', () => {
  const originalModule = jest.requireActual('three');
  return {
    ...originalModule,
    Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
      x, y, z,
      clone: jest.fn().mockReturnThis(),
      sub: jest.fn().mockReturnThis(),
      add: jest.fn().mockReturnThis(),
      multiplyScalar: jest.fn().mockReturnThis(),
      normalize: jest.fn().mockReturnThis(),
      distanceTo: jest.fn(() => 0), // Mock distance to return 0 for simplicity
      copy: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      crossVectors: jest.fn().mockReturnThis(),
      dot: jest.fn(() => 0),
      applyQuaternion: jest.fn().mockReturnThis(),
      length: jest.fn(() => 0),
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      isMesh: true,
      geometry: {},
      material: {},
      position: new originalModule.Vector3(),
      rotation: new originalModule.Euler(),
      scale: new originalModule.Vector3(),
      matrixWorld: new originalModule.Matrix4(),
      parent: null,
      userData: {},
      traverse: jest.fn((callback) => callback(this)),
      // Add a mock for props to simulate onClick
      props: { onClick: jest.fn() },
    })),
    BoxGeometry: jest.fn().mockImplementation(() => ({})),
    MeshStandardMaterial: jest.fn().mockImplementation(() => ({})),
    Plane: jest.fn().mockImplementation(() => ({
      normal: new originalModule.Vector3(),
      constant: 0,
    })),
    Matrix4: jest.fn().mockImplementation(() => ({
      multiplyMatrices: jest.fn().mockReturnThis(),
    })),
    Frustum: jest.fn().mockImplementation(() => ({
      setFromProjectionMatrix: jest.fn(),
      intersectsSphere: jest.fn(() => true), // Always visible for simplicity
    })),
    Sphere: jest.fn().mockImplementation(() => ({})),
    Euler: jest.fn().mockImplementation(() => ({})),
  };
});
