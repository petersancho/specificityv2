# Specificity

Specificity is a custom-built parametric design environment that combines direct 3D modeling with visual programming through an integrated dual-panel workspace. The system provides complete control over the geometry kernel and computational graph execution by implementing all core functionality without reliance on third-party CAD libraries or node editor frameworks.

## Project Philosophy

The architecture prioritizes complete ownership of core systems over convenience of third-party integration. The geometry kernel implements all mathematical operations from vertices through NURBS surfaces without depending on external CAD libraries. The 3D viewport uses direct WebGL rendering through Three.js, maintaining explicit control over vertex buffers, shader programs, and rendering state. The node editor uses ETO.forms, a canvas-based rendering system that draws graphs using immediate-mode rendering patterns for superior performance with large graphs. This approach trades the convenience of established libraries for the flexibility to implement exactly the behavior this application requires.

The dual-panel workspace presents two complementary interaction paradigms. Roslyn serves as the direct manipulation 3D modeling environment where users create and edit geometry through viewport interactions and command-driven workflows. Numerica provides the visual programming interface where users construct parametric definitions and computational graphs. These panels share unified state through a Zustand store, enabling workflows where models inform graph definitions and graphs generate or modify geometry.

## Getting Started

The project uses a monorepo structure with separate client and server directories. The client directory contains the Vite-based React application implementing both modeling and node editor interfaces. The server directory provides a minimal Node.js backend for project persistence and potential future collaboration features.

To run the development environment, first install dependencies in both client and server directories. The client development server runs on port 5173 by default and proxies API requests to the server on port 3001. Environment variables for port configuration can be specified in a root-level .env file following the template in .env.example.

The client application launches with an empty workspace containing the Roslyn modeling panel on the left and the Numerica workflow panel on the right. Panels can be dragged to reposition, resized by dragging their borders, and captured to high-resolution images using the camera button in each panel's header. The workspace supports zoom and pan through mouse wheel and middle-drag gestures, with a reference grid providing spatial orientation.

## Documentation Structure

Understanding Specificity requires familiarity with several interconnected systems. The documentation is organized to support progressive learning from high-level architecture through specific implementation patterns. Begin with the architecture document to understand how subsystems integrate, then consult the conventions document when implementing new features to ensure consistency with established patterns.

The ARCHITECTURE.md file provides comprehensive coverage of system design including the geometry kernel, state management layer, 3D viewport implementation, command system, workflow evaluation, and data flow patterns. This document explains how subsystems interact and what architectural principles guide implementation decisions. Read this document first to build a mental model of the system before diving into code.

The CONVENTIONS.md file establishes code standards and patterns for file organization, naming, TypeScript types, state management, component structure, and testing. Follow these conventions when implementing new features to maintain consistency across the codebase. The conventions document serves as a reference during development rather than requiring memorization before starting work.

The AI_AGENT_GUIDE.md file provides specific guidance for working with AI assistants on this codebase. It explains common implementation patterns, integration requirements for new features, and how to navigate the architecture when making changes. Human developers may also find this document valuable as it synthesizes architectural knowledge with practical development advice.

## Project Structure

The repository is organized to separate concerns while maintaining clear relationships between related code. The root level contains tooling configuration, documentation, and environment templates. The client directory houses all front-end code including UI components, state management, geometry kernel, and command system. The server directory contains API endpoints, persistence logic, and static data files.

Within the client source tree, organization follows feature domains rather than technical layers. The components directory contains UI implementations organized by panel, with modeler components separated from workflow components. The store directory houses the Zustand state management layer. The commands directory implements the command registry and parsing logic. The geometry and math directories contain the custom geometry kernel and mathematical utilities. The types directory provides TypeScript definitions shared across the application.

Key entry points for understanding the codebase include App.tsx which orchestrates the workspace shell, ViewerCanvas.tsx which implements the core 3D viewport, ModelerSection.tsx which provides the Roslyn panel UI, WorkflowSection.tsx which implements the Numerica panel, and useProjectStore.ts which defines the central state model. These files integrate multiple subsystems and serve as reference implementations for how components should interact with state and with each other.

## Core Subsystems

The geometry kernel provides the mathematical foundation for all modeling operations through a type-discriminated collection of geometry records. Supported geometry types include isolated vertices, connected polylines, NURBS curves with arbitrary degree, NURBS surfaces with independent U and V parameterization, and extrusions that sweep profiles along paths. The kernel implements operations as pure functions that accept geometry records and return new records without mutation, enabling straightforward history management and preview rendering.

The state management layer uses Zustand to maintain a single source of truth encompassing geometry data, scene organization, selection state, camera configuration, workflow graphs, and command history. All application state lives in this store, and all mutations occur through store actions that validate inputs, compute new state, and update atomically. Components subscribe to specific state slices and re-render only when those slices change.

The 3D viewport uses direct WebGL rendering through Three.js with explicit control over vertex buffers, shader programs, and rendering state. The viewport renders geometry from the store using custom GLSL shaders that provide precise control over selection highlighting, preview rendering, and visual quality. The rendering pipeline captures user interactions through pointer and keyboard events and dispatches store actions to reflect interaction outcomes. The viewport supports object selection through raycasting, component selection for vertices and edges and faces, box selection through left-drag marquee, and transform manipulation through a custom gizmo widget with dedicated shader programs.

The command system provides text-driven invocation of modeling operations through a central registry of command definitions. Commands may operate immediately on selected geometry or may enter modal interaction modes that capture pointer input. The command parser accepts both exact identifiers and fuzzy aliases, enabling users to type abbreviated forms while maintaining unambiguous resolution.

The workflow system implements visual programming through a node graph where computational nodes connect through typed ports to form evaluation graphs. Graph evaluation uses a pull-based lazy model where output values are computed on demand by recursively evaluating upstream dependencies. The workflow uses ETO.forms, a canvas-based rendering system that draws the entire graph using immediate-mode rendering patterns. The canvas approach provides superior performance for large graphs, enables custom visual styling with precise control over fonts and anti-aliasing, and supports smooth animation and interaction feedback. Node rendering, connection drawing, and hit testing are implemented using canvas API calls rather than DOM elements.

## Current Development Status

The modeling viewport is fully functional with support for geometry creation through commands, transformation through gizmo manipulation, selection at object and component levels, box selection through marquee drag, and undo/redo history. The WebGL rendering pipeline provides high-quality visuals with custom shaders for selection highlighting, anti-aliased line rendering, and distance-based level-of-detail control. The gizmo hit areas have been tuned for precision based on user feedback, and the box selection behavior follows professional CAD conventions with containment versus crossing modes determined by drag direction.

The screenshot capture system works for both panels, rendering to off-screen containers at high resolution and displaying preview modals with download functionality. The capture system hides interactive elements during rendering and supports transparent backgrounds for clean exports.

The workflow system uses ETO.forms for canvas-based node graph rendering with proper connection routing and evaluation capabilities. The canvas implementation provides smooth interaction, efficient rendering of large graphs, and precise control over visual styling. The node editor supports graph editing, parameter adjustment, and pull-based lazy evaluation with caching.

The geometry kernel currently supports basic primitives and transformations but requires expansion to support advanced NURBS operations, Boolean operations, and surface analysis. The kernel architecture supports these additions through the same functional patterns used for existing geometry types.

## Development Workflow

When implementing new features, begin by understanding which subsystems the feature touches and how those subsystems integrate. Read the relevant sections of the architecture document to understand the intended design, then examine existing implementations to see how current code realizes that design. Many features span multiple subsystems, requiring coordinated changes to the kernel, viewport, store, and commands.

Start implementations with the data model before building UI. Define TypeScript types for new entities, add them to store state, implement store actions for CRUD operations, and verify the data model through simple tests or console experiments. Only after the data model is solid should you implement UI that displays and manipulates that data. This approach prevents UI implementation details from influencing the underlying architecture.

Follow established patterns for naming, organization, and structure as documented in the conventions file. Use TypeScript's type system to guide implementation, particularly discriminated unions that ensure exhaustive case handling. When the type system reports errors about unhandled cases or invalid property access, fix the underlying issue rather than using type assertions to silence warnings.

Test features through both manual interaction and programmatic tests where appropriate. Geometry operations are amenable to property-based testing that verifies mathematical correctness. Integration tests that simulate user workflows provide confidence that features work correctly in context. Focus testing effort on critical paths rather than achieving coverage metrics.

## Working with AI Assistants

This codebase is designed to support AI-assisted development through comprehensive documentation and consistent patterns. When working with AI tools like Claude or GitHub Copilot, provide context about which subsystems are involved and what integration points matter. Reference the architecture and conventions documents when asking for implementations to ensure AI-generated code follows project patterns.

The AI_AGENT_GUIDE.md file provides specific instructions for AI assistants working on this codebase, including how to navigate the architecture, common implementation patterns, integration requirements for new features, and testing strategies. Human developers using AI assistance should read this guide to understand what context AI tools need for effective code generation.

When AI tools generate code that deviates from documented patterns, evaluate whether the deviation represents a genuine improvement or a misunderstanding of project requirements. The documentation describes intended architecture, but implementation may evolve beyond initial design. Update documentation when patterns change intentionally rather than treating documentation as immutable specification.

## Contributing and Architecture Evolution

This codebase represents an evolving system where architectural patterns mature through implementation experience. The documentation captures current understanding but should be updated as patterns solidify or as new requirements drive architectural changes. When making significant changes, consider whether those changes represent new patterns that should be documented for consistency.

The migration from ReactFlow to custom node editor represents a major architectural initiative that will affect workflow implementation significantly. During this transition, maintain clear separation between business logic and rendering implementation so that the evaluation engine and data model survive the transition intact. Document decisions made during this migration to guide similar future transitions.

The geometry kernel will expand to support more sophisticated operations as modeling requirements become clear. New geometry types, Boolean operations, and surface analysis capabilities should follow the functional patterns established by current implementations. Consider whether new geometric requirements suggest fundamental architecture changes or whether they can be accommodated within existing patterns.

## Additional Resources

The docs directory contains implementation status tracking and historical requirements documentation. These files provide context about completed work and pending initiatives. The server/data directory contains reference data for materials and other lookup tables used during geometry operations.

For questions about specific implementation details not covered in documentation, examine the relevant source files directly. The codebase is organized to make related functionality discoverable, with clear naming and consistent patterns throughout. Many implementation questions can be answered by finding similar existing code and following its patterns.
