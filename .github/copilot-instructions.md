# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Context
This is an Angular TypeScript real estate investment calculator application. The app is client-side only and uses IndexedDB for local data storage.

## Key Features
- Real estate investment calculations (ROI, cash flow, appreciation, etc.)
- Form-based data input with validation
- Local storage using IndexedDB
- Responsive design
- TypeScript with strong typing

## Architecture Guidelines
- Use Angular standalone components
- Implement reactive forms with proper validation
- Create dedicated services for calculations and IndexedDB operations
- Use TypeScript interfaces for all data models
- Follow Angular style guide conventions
- Implement proper error handling and user feedback

## Code Preferences
- Use TypeScript strict mode
- Prefer composition over inheritance
- Use RxJS observables for asynchronous operations
- Implement proper component lifecycle management
- Use Angular Material or Bootstrap for UI components
- Write unit tests for services and components
