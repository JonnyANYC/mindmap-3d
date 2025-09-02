# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Tool Usage
- when committing code, always mention in the commit message what changes were made since the last commit. If the code changes were made to resolve one or more GitHub issues, then list the issue IDs and the issue titles in the commit message. Mention in the commit message if some failing unit tests were skipped.
- Use the GitHub CLI (`gh`) with the Shell tool for all GitHub-related tasks.
- Use the following command to fetch GitHub issues for a given milestone: `gh issue list --repo https://github.com/JonnyANYC/mindmap-3d --milestone <milestone name> --state open`
- Use the following command to view a GitHub issue: `gh issue view <issue ID> --repo <repo>`
- Use the following commend to close a GitHub issue: `gh issue close <issue #> --comment <change comment>`
- Use the following command to run the app to test for errors. wait for 30 seconds after starting the app to check for possible error output. command: `npm run dev & sleep 10 && curl -s -o /dev/null "http://localhost:3000/" && pkill -f "node .*mindmap.*next dev"`
- Never run `next dev`.


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

## App terminology
- Entry - the main object of the system. Entries are displayed as boxes in the 3D mind map.
- Connection - an undirected line that connects two Entries 
- Mind map - a 3D, undirected graph, composed of Entries (nodes) and Connections (edges)
- Re-arrange - a user-initiated action that tells the system to reposition the Entries more evenly in the nearby 3D space, to make navigation easier
- Edit overlay - the screen that is displayed when the 'Edit' link is clicked on an Entry. it allows the user to modify the title and description.
