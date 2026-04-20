# Herdsman Prototype

Simple 2D mini-game prototype built with TypeScript and PixiJS.

## Features

- Green game field with Main Hero (red circle).
- Randomly spawned animals (white circles) on random positions.
- Yard destination area (yellow zone).
- Score counter at the top UI.
- Click-to-move hero controls.
- Animal collection and follow behavior near hero.
- Group size limit: up to 5 animals.
- Score increases when collected animals reach the yard.
- Optional behaviors implemented:
  - Random-time animal spawner.
  - Patrol movement for free animals.

## Tech Stack

- TypeScript
- PixiJS
- Vite

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed in terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

## Controls

- Left mouse click on the field: move Main Hero to target point.

## Notes

- The prototype focuses on gameplay logic and architecture clarity.
- Placeholder circle graphics are used for all entities.
