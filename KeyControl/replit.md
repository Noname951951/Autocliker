# Keyboard Automation Application

## Overview

This is a full-stack web application that provides keyboard automation capabilities, allowing users to configure and execute automated key presses with various operation modes and timing controls. The application features a React frontend with a modern UI built using shadcn/ui components and an Express.js backend with WebSocket support for real-time status updates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with clearly separated client, server, and shared code:

- **Frontend**: React SPA with TypeScript, using Vite for development and building
- **Backend**: Express.js REST API with WebSocket support for real-time communication
- **Database**: PostgreSQL with Drizzle ORM (currently using Neon Database)
- **Shared**: Common TypeScript schemas and types used by both frontend and backend

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for development and production
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query for server state, local React state for UI
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Native WebSocket API for status updates

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle with PostgreSQL dialect
- **Real-time Communication**: WebSocket server for broadcasting automation status
- **Storage**: PostgreSQL database with full persistence via DatabaseStorage
- **Keyboard Automation**: Mock implementation with hooks for actual keyboard libraries

### Data Storage
- **Primary Database**: PostgreSQL (Neon Database) - ACTIVE
- **ORM**: Drizzle with migrations support
- **Current Implementation**: DatabaseStorage with full PostgreSQL persistence
- **Schema**: Single table for automation tasks with comprehensive configuration options
- **Connection**: WebSocket pool via neon-serverless driver

### Authentication & Authorization
- **Current State**: No authentication implemented
- **Session Management**: Basic Express session configuration present but unused
- **Future Consideration**: Ready for authentication layer addition

## Data Flow

1. **Task Configuration**: User configures automation parameters through React form
2. **Validation**: Form data validated using Zod schemas shared between client/server
3. **API Communication**: RESTful endpoints for CRUD operations on automation tasks
4. **Real-time Updates**: WebSocket connection provides live status updates to frontend
5. **Keyboard Automation**: Backend simulates or executes keyboard actions based on configuration
6. **Status Broadcasting**: All connected clients receive real-time automation status updates

### Key API Endpoints
- `POST /api/automation/start` - Start automation task
- `POST /api/automation/stop` - Stop running automation
- `GET /api/automation/status` - Get current automation status
- WebSocket connection for real-time status updates

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React ecosystem with modern hooks
- **Component Library**: Radix UI primitives with shadcn/ui wrapper
- **HTTP Client**: Native fetch API with TanStack Query wrapper
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with PostCSS processing

### Backend Dependencies
- **Database**: Neon Database (PostgreSQL-compatible serverless database)
- **ORM**: Drizzle ORM with PostgreSQL driver
- **WebSocket**: Native ws library for real-time communication
- **Keyboard Automation**: Prepared for robotjs or similar libraries (currently mocked)

### Development Dependencies
- **Build Tools**: Vite for frontend, esbuild for backend
- **Type Checking**: TypeScript with strict configuration
- **Development Server**: Express with Vite middleware integration

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: tsx for TypeScript execution with file watching
- **Database**: Drizzle migrations with push command for schema updates
- **Real-time Features**: WebSocket server runs alongside Express server

### Production Build
- **Frontend**: Static files built to `dist/public` directory
- **Backend**: Bundled with esbuild to `dist/index.js`
- **Serving**: Express serves both API and static frontend files
- **Database**: PostgreSQL connection via environment variable

### Key Configuration
- **Environment Variables**: `DATABASE_URL` required for database connection
- **Port Configuration**: Configurable via environment or defaults
- **Asset Serving**: Express serves built frontend from dist/public
- **WebSocket Integration**: WebSocket server runs on same HTTP server as Express

### Scaling Considerations
- **Database**: Already configured for serverless PostgreSQL (Neon)
- **Session Storage**: Prepared for PostgreSQL session store
- **Real-time Communication**: WebSocket implementation ready for horizontal scaling with session affinity
- **Static Assets**: Frontend assets can be served via CDN in production