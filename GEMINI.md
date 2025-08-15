# GEMINI.md

This file covers high-level details on the project for use by Gemini Code Assist

## Commands

### Development
```bash
npm run dev        # Start development server on http://localhost:3000
npm run build      # Build production application
npm run start      # Start production server
npm run lint       # Run ESLint
npm test           # Run Jest test suite
npm test:watch     # Run Jest in watch mode
```

### Component Management
```bash
npx shadcn add <component>  # Add shadcn/ui components
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 with shadcn/ui (New York style, Neutral colors)
- **3D Graphics**: Three.js with @react-three/fiber and @react-three/drei
- **Database**: Supabase (client libraries installed)
- **Testing**: Jest with React Testing Library

### Project Structure
- `/src/app/` - Next.js App Router pages and layouts
- `/src/components/` - React components including 3D scenes
- `/src/lib/` - Utility functions and shared code
- `/public/` - Static assets

### Key Components
- **Scene3D**: Main 3D visualization component using React Three Fiber
  - Located at `/src/components/Scene3D.tsx`
  - Implements interactive 3D objects with OrbitControls
  - Uses PerspectiveCamera with user-controlled navigation

### Configuration Files
- `tailwind.config.ts` - Tailwind CSS with shadcn/ui theme extensions
- `components.json` - shadcn/ui configuration
- `jest.config.js` - Jest testing configuration with Next.js integration
- `jest.setup.js` - Jest setup with @testing-library/jest-dom

### Import Aliases
- `@/*` maps to `src/*`
- Components use `@/components`, utilities use `@/lib/utils`

### Tool Usage
- when committing code, always mention in the commit message what changes were made since the last commit. If the code changes were made to resolve one or more GitHub issues, then list the issue IDs and the issue titles in the commit message. Mention in the commit message if some failing unit tests were skipped.
