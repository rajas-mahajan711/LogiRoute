# LogiRoute AI: Warehouse Robot Path Planner

A high-performance path planning visualizer and benchmarking platform for automated guided vehicles (AGVs) in warehouse environments. It couples a native **C++ Algorithmic Core** with an interactive **React + Vite** visualization dashboard and an **Express.js** coordinator with automatic JavaScript fallback.

---

## System Architecture

```
[React + Vite Frontend (Port 5173)]
        │
   HTTP / REST (JSON)
        ▼
[Node.js + Express Coordinator (Port 5000)]
        │
   Fast stdio IPC / Native Child Process Exec
        ▼
[Compiled C++ DSA Routing Engine (routing_engine.exe)]
   • A* Search (Manhattan Heuristic)
   • Breadth-First Search (BFS)
   • Depth-First Search (DFS)
   • Dijkstra's Algorithm (Uniform Cost)
   • Greedy Best-First Search
```

---

## Core Algorithms & DSA Implementation

- **A\* Search**: Combines Dijkstra's path cost $g(n)$ with Manhattan distance heuristic $h(n)$ for fast, guaranteed-optimal paths.
- **BFS (Breadth-First Search)**: Explores layer-by-layer; mathematically guarantees the shortest path on unweighted grid graphs.
- **DFS (Depth-First Search)**: Explores deep search branches; demonstrates space exploration and dead-end backtracks.
- **Dijkstra's Algorithm**: Priority-queue driven uniform cost search ensuring optimal path finding.
- **Greedy Best-First Search**: Heuristic-guided greedy traversal towards the target.
- **Side-by-Side Comparison**: Benchmarks all 5 algorithms simultaneously, tracking path length, total nodes explored, and execution time ($\text{ms}$).

---

## Quick Start

### 1. Automated Start
Double-click or run:
```powershell
.\start.bat
```

### 2. Manual Start

#### Compile C++ Engine:
```powershell
cd cpp-engine
g++ -O3 -std=c++14 routing_engine.cpp -o routing_engine.exe
cd ..
```

#### Start Backend Coordinator:
```powershell
cd backend
npm install
npm start
```
*Backend active at `http://localhost:5000`*

#### Start Frontend Visualizer:
```powershell
cd frontend
npm install
npm run dev
```
*Visualizer active at `http://localhost:5173`*
