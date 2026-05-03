# CTU Argao Campus Navigation System

## Overview

A modern 2D smart-campus navigation system for Cebu Technological University – Argao Campus built with React, TypeScript, and Tailwind CSS.

## Key Features

### ✅ Strict Map Accuracy
- Uses the provided SVG map (`Cebu_Technological_University-_Argao_Campus_Map_(2).svg`) as the PRIMARY foundation
- Preserves ALL SVG element IDs, CSS classes, layer names, building placements, road paths, and walkways
- No redesign or reinterpretation of the campus layout

### ✅ Intelligent Pathway Detection
- **Walkable Routes**: Only uses designated paths for navigation
  - Grey roads (`stroke="#B4BEC7"`, 9px width)
  - Blue pathways (`stroke="#3BB4FF"`, 5px width)
- **Gate Exclusion**: Correctly identifies and excludes gates (`fill="#6E6D6D"`) from navigation routes
- Graph-based pathfinding using actual SVG path coordinates

### ✅ Professional 2D Design
- Clean, flat 2D navigation map (SM mall/airport wayfinding style)
- Modern color palette and visual styling
- Professional rendering with subtle shadows and organized landscaping
- Not 3D or isometric - pure top-down navigation view

### ✅ Interactive Features
- **Search Functionality**: Find rooms, buildings, offices, CRs, facilities, and landmarks
- **Clickable Map Areas**: Interactive building elements with hover effects
- **Destination Highlighting**: Visual markers for selected locations
- **Shortest-Path Calculation**: A* algorithm for optimal route finding
- **Route Visualization**: Animated path overlay showing the navigation route
- **Dynamic Updates**: Real-time route recalculation based on selections

## Technical Architecture

### Components

#### `App.tsx`
Main application component managing:
- Location selection state
- Current location / destination
- Route path and distance calculation
- UI layout and navigation panel

#### `CampusMapFinal.tsx`
Core map visualization component:
- Loads and renders the exact SVG from Map_(2).svg
- Applies interactive styling to paths and buildings
- Draws route overlays with animated markers
- Highlights selected locations with pulsing indicators

#### `SearchBar.tsx`
Search interface for finding campus locations:
- Filters by name, keywords, and type
- Displays results with location type badges
- Handles location selection

### Services

#### `pathwayExtractor.ts`
Defines valid walkable pathways:
- Extracts 2 grey road paths and 8 blue pathway paths
- Excludes ALL gate elements (#6E6D6D)
- Builds navigation graph from path coordinates
- Creates node connections for pathfinding

#### `pathfinding.ts`
A* pathfinding algorithm implementation:
- Finds shortest path between two points
- Uses only valid pathway nodes
- Calculates total route distance
- Returns optimal navigation path

### Data

#### `campusData.ts`
Campus location database:
- 100+ locations (buildings, rooms, offices, facilities)
- Each location has coordinates, type, and keywords
- Path nodes built from `buildPathwayGraph()`

#### `types/campus.ts`
TypeScript interfaces:
```typescript
interface Location {
  id: string;
  name: string;
  type: 'building' | 'room' | 'office' | 'cr' | 'department' | 'facility' | 'landmark';
  x: number;
  y: number;
  keywords?: string[];
}

interface PathNode {
  id: string;
  x: number;
  y: number;
  connections: string[]; // Connected node IDs
}
```

## Navigation Logic

### Valid Pathways Only

The system uses ONLY the correct road paths and walkable pathways defined in the SVG:

1. **Grey Roads** (#B4BEC7, 9px stroke):
   - `road-main-vertical`: Main vertical corridor
   - `road-west-corridor`: Western connecting road

2. **Blue Pathways** (#3BB4FF, 5px stroke):
   - `pathway-admin-area`: Admin building pathways
   - `pathway-admin-horiz-1` & `pathway-admin-horiz-2`: Horizontal connectors
   - `pathway-west-vertical`: Western vertical path
   - `pathway-west-connector`: Western area connector
   - `pathway-east-main`: Eastern main pathway
   - `pathway-cote-coed`: COTE-COED building connector
   - `pathway-benrc-connector`: BENRC area path
   - `pathway-east-vertical`: Eastern vertical corridor

3. **Gates** (#6E6D6D) - **EXCLUDED FROM NAVIGATION**:
   - Treated as boundaries only
   - NOT used for pathfinding
   - Visually de-emphasized (opacity: 0.25)

### Graph Construction

1. Extract coordinates from each valid pathway's SVG `d` attribute
2. Create nodes at each coordinate point
3. Connect sequential nodes within each pathway
4. Connect nearby nodes from different pathways (intersections)
5. Build navigation graph with 30px proximity threshold

### Pathfinding Process

1. User selects a destination location
2. System finds nearest pathway nodes to start/end coordinates
3. A* algorithm calculates optimal route using ONLY valid pathway connections
4. Route is visualized with:
   - Red animated path overlay
   - Green start marker
   - Red end marker
   - Distance calculation

## Visual Styling

### Map Elements

- **Main Roads**: Thick grey lines (11px), 90% opacity
- **Walkways**: Medium blue lines (7px), 95% opacity
- **Gates**: Thin grey lines (0.5px), 25% opacity (boundaries only)
- **Buildings**: 
  - Light grey (#C5C3C3) for main structures
  - Medium grey (#D9D9D9) for secondary buildings
  - Green (#A9E9C1) for landscaped areas
  - Hover: Orange highlight (#FFC857)

### Interactive Markers

- **Selected Location**: Blue pulsing circle with center pin
- **Route Path**: Red line with white animated dashes
- **Start Point**: Green circle
- **End Point**: Red circle

### Legend

Located in bottom-right corner showing:
- Main Roads (grey)
- Walkways (blue)
- Gates/Boundaries (faded grey)
- Your Route (red)
- Selected Location (blue)

## File Structure

```
src/
├── app/
│   ├── components/
│   │   ├── CampusMapFinal.tsx   # Main map component
│   │   └── SearchBar.tsx         # Search interface
│   ├── services/
│   │   ├── pathwayExtractor.ts   # Valid pathway definitions
│   │   └── pathfinding.ts        # A* pathfinding
│   ├── data/
│   │   └── campusData.ts         # Location database
│   ├── types/
│   │   └── campus.ts             # TypeScript interfaces
│   └── App.tsx                   # Main app component
└── imports/
    ├── Cebu_Technological_University-_Argao_Campus_Map_(2).svg
    └── pasted_text/
        └── ctu-argao-map-2.css
```

## Usage

### Search for a Location
1. Type location name, building, or facility in the search bar
2. Select from filtered results
3. Location is highlighted on the map

### Navigate to a Destination
1. Search and select your destination
2. Click "Set as Starting Point" to set current location
3. View the calculated route with distance
4. Follow the red animated path

### Explore the Map
- Hover over buildings to highlight them
- Scroll to zoom in/out
- Drag to pan across the campus
- Click buildings for interaction (future enhancement)

## Future Enhancements

- Building click handlers for detailed information
- Floor plans for multi-story buildings
- Real-time location tracking (GPS integration)
- Turn-by-turn navigation instructions
- Accessibility route options
- Points of interest markers
- Event location markers

## Compliance

✅ Preserves exact SVG structure from Map_(2).svg
✅ Uses ONLY valid walkable pathways (grey roads + blue paths)
✅ Excludes gates (#6E6D6D) from navigation  
✅ Maintains 2D professional wayfinding style
✅ Keeps all SVG elements editable and scalable
✅ Compatible with provided CSS layer structure
