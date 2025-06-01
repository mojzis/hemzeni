# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an augmented reality (AR) web application called "Hemzeni" (Czech for "swarming") that overlays animated creatures on a live camera feed. The application is built with vanilla JavaScript, HTML5, and CSS, using WebRTC for camera access and device motion APIs for interactive features.

## Key Commands

### Running the Application
- Open `index.html` in a web browser (preferably on a mobile device)
- No build process required - this is a static website
- For development: Use a local web server to avoid CORS issues with camera access (e.g., `python -m http.server` or VS Code Live Server)

### Testing Motion Features
- Open `tst.html` to test device shake detection independently
- Shake threshold is set to 15 in both files

## Architecture Overview

### Core Components

1. **Camera System** (`js/animals.js`):
   - Uses WebRTC getUserMedia API for camera access
   - Supports front/rear camera toggle
   - Handles iOS motion permission requests

2. **Creature Animation System**:
   - Four creatures with unique behaviors:
     - Beetle: Oscillation movement pattern
     - Lachticek: Jumping movement pattern  
     - Kudlanka: Looping movement pattern
     - Blecha: Fast looping movement pattern
   - Each creature has configurable properties:
     - Speed, size change factor, rotation frequency
     - Movement patterns (oscillation, jump, loop, jitter)
     - Reaction speed to device tilt

3. **Interactive Features**:
   - **Device Motion**: Creatures respond to device tilt (gamma/beta)
   - **Shake Detection**: Shaking device resets creatures to corners
   - **Edge Teleportation**: 20% chance to disappear and reappear on opposite side
   - **Collision Avoidance**: Creatures push apart when overlapping
   - **Dynamic Sizing**: Creatures grow larger when near center (perspective effect)

### Key Functions in `js/animals.js`:

- `startVideoStream()`: Initializes camera feed
- `requestMotionPermission()`: Handles iOS motion permission
- `updatePosition()`: Core movement logic with pattern application
- `updateSize()`: Perspective-based size scaling
- `avoidCollision()`: Prevents creature overlap
- `checkEdgeAndTeleport()`: Edge detection and teleportation
- `resetAnimalPositions()`: Shake response - moves creatures to corners
- `animateAnimals()`: Main animation loop using requestAnimationFrame

### Motion Detection Parameters:
- Shake threshold: 15 (magnitude of acceleration)
- Shake cooldown: 1 second between detections
- Tilt influence: Scaled by tiltX/90 for direction adjustment