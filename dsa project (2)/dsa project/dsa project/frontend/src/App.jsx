import React, { useState, useEffect, useRef, useCallback } from 'react';
import GridCanvas from './components/GridCanvas';
import { Play, ArrowRightLeft, Trash2, RotateCcw, Flag, Square, Eye, Info, Check } from 'lucide-react';

const ALGORITHMS = ['A*', 'BFS', 'DFS', 'Dijkstra', 'Greedy Best-First'];

const ALGO_METRICS = {
  'A*': {
    title: '★ A*',
    time: 'O(E)',
    space: 'O(V)',
    timeNote: 'Worst-case implementation-dependent',
    spaceNote: 'Auxiliary memory',
    desc: "A* combines Dijkstra's cost-to-come with a Manhattan heuristic for directed, optimal pathfinding.",
    features: ['Optimal path (with admissible heuristic)', 'Efficient node expansion', 'Standard for warehouse grids']
  },
  'BFS': {
    title: '★ BFS',
    time: 'O(V + E)',
    space: 'O(V)',
    timeNote: 'Vertices and edges',
    spaceNote: 'Queue stores entire frontier',
    desc: 'Breadth-First Search explores layer-by-layer from the start node, guaranteeing the unweighted shortest path.',
    features: ['Guaranteed shortest path on unweighted grids', 'Systematic layer-by-layer exploration', 'Predictable memory footprint']
  },
  'DFS': {
    title: '★ DFS',
    time: 'O(V + E)',
    space: 'O(V)',
    timeNote: 'Linear graph exploration',
    spaceNote: 'Call stack / recursion depth',
    desc: 'Depth-First Search explores deep corridors until hitting a dead-end before backtracking.',
    features: ['Rapid corridor exploration', 'Memory efficient in narrow trees', 'Non-optimal traversal demonstration']
  },
  'Dijkstra': {
    title: '★ Dijkstra',
    time: 'O(E + V log V)',
    space: 'O(V)',
    timeNote: 'Using binary priority queue',
    spaceNote: 'Distance table and queue',
    desc: 'Dijkstra expands the node with the lowest cumulative distance, ensuring shortest path on weighted graphs.',
    features: ['Guarantees optimal path', 'Exhaustive search across all directions', 'Foundational shortest-path algorithm']
  },
  'Greedy Best-First': {
    title: '★ Greedy Best-First',
    time: 'O(V log V)',
    space: 'O(V)',
    timeNote: 'Heuristic-driven priority queue',
    spaceNote: 'Priority queue storage',
    desc: 'Greedy Best-First expands nodes solely based on estimated distance to the goal.',
    features: ['Rapid targeted search toward goal', 'Minimal nodes explored in open areas', 'Can be sub-optimal with obstacles']
  }
};

const DIMS = {
  '10x10': { r: 10, c: 10 },
  '15x15': { r: 15, c: 15 },
  '20x20': { r: 20, c: 20 },
  '25x25': { r: 25, c: 25 }
};

export default function App() {
  const [gridSize, setGridSize] = useState('15x15');
  const rows = DIMS[gridSize].r;
  const cols = DIMS[gridSize].c;

  const [movement, setMovement] = useState('4-directional');
  const [movementCost, setMovementCost] = useState('Uniform');
  const [editMode, setEditMode] = useState('wall');

  const [start, setStart] = useState({ r: 7, c: 2 });
  const [goal, setGoal] = useState({ r: 7, c: 12 });
  const [walls, setWalls] = useState([
    { r: 4, c: 7 }, { r: 5, c: 7 }, { r: 6, c: 7 },
    { r: 7, c: 7 }, { r: 8, c: 7 }, { r: 9, c: 7 }, { r: 10, c: 7 }
  ]);

  const [selectedAlgo, setSelectedAlgo] = useState('A*');
  const [path, setPath] = useState([]);
  const [visited, setVisited] = useState([]);
  const [frontier, setFrontier] = useState([]);
  const [pathLength, setPathLength] = useState(0);
  const [nodesExplored, setNodesExplored] = useState(0);
  const [execTime, setExecTime] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [running, setRunning] = useState(false);
  const [comparison, setComparison] = useState(null);

  // Layer toggles
  const [showFrontier, setShowFrontier] = useState(true);
  const [showVisited, setShowVisited] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [showRobot, setShowRobot] = useState(true);

  // Playback
  const [animPhase, setAnimPhase] = useState('idle');
  const [animStep, setAnimStep] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1);
  const [robotPos, setRobotPos] = useState(null);
  const fullPathRef = useRef([]);

  // Animation timer
  useEffect(() => {
    if (animPhase !== 'animating') return;
    const fp = fullPathRef.current;
    if (!fp || !fp.length) return;

    const delay = Math.max(20, 240 / animSpeed);
    const timer = setTimeout(() => {
      const next = animStep + 1;
      if (next < fp.length) {
        setAnimStep(next);
        setRobotPos({ r: fp[next][0], c: fp[next][1] });
      } else {
        setAnimPhase('completed');
        setStatus('Path Found');
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [animPhase, animStep, animSpeed]);

  const handlePlay = useCallback(() => {
    const fp = fullPathRef.current;
    if (!fp || !fp.length) return;
    if (animPhase === 'idle' || animPhase === 'completed') {
      setAnimStep(0);
      setRobotPos({ r: fp[0][0], c: fp[0][1] });
      setAnimPhase('animating');
    } else {
      setAnimPhase(p => p === 'animating' ? 'paused' : 'animating');
    }
  }, [animPhase]);

  const handleRestart = useCallback(() => {
    const fp = fullPathRef.current;
    if (!fp || !fp.length) return;
    setAnimStep(0);
    setRobotPos({ r: fp[0][0], c: fp[0][1] });
    setAnimPhase('animating');
  }, []);

  const handlePrevStep = useCallback(() => {
    const fp = fullPathRef.current;
    if (!fp || !fp.length) return;
    setAnimPhase('paused');
    setAnimStep(s => {
      const n = Math.max(0, s - 1);
      setRobotPos({ r: fp[n][0], c: fp[n][1] });
      return n;
    });
  }, []);

  const handleNextStep = useCallback(() => {
    const fp = fullPathRef.current;
    if (!fp || !fp.length) return;
    setAnimPhase('paused');
    setAnimStep(s => {
      const n = Math.min(fp.length - 1, s + 1);
      setRobotPos({ r: fp[n][0], c: fp[n][1] });
      return n;
    });
  }, []);

  const handleSeek = useCallback((v) => {
    const fp = fullPathRef.current;
    if (!fp || !fp.length) return;
    const idx = Math.max(0, Math.min(fp.length - 1, Number(v)));
    setAnimPhase('paused');
    setAnimStep(idx);
    setRobotPos({ r: fp[idx][0], c: fp[idx][1] });
  }, []);

  // Run single algorithm
  const runAlgorithm = useCallback(async (algoToRun = selectedAlgo) => {
    setRunning(true);
    setStatus('Computing...');
    setAnimPhase('idle');
    setRobotPos(null);
    fullPathRef.current = [];

    try {
      const res = await fetch('/api/route/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows, cols,
          start: [start.r, start.c],
          goal: [goal.r, goal.c],
          obstacles: walls.map(w => [w.r, w.c]),
          algorithm: algoToRun,
          movement
        })
      });
      const data = await res.json();
      if (data.success && data.full_path && data.full_path.length > 0) {
        const fp = data.full_path;
        fullPathRef.current = fp;
        setPath(fp);
        setVisited(data.visited_nodes || []);
        setFrontier(data.frontier_nodes || []);
        setPathLength(data.total_distance);
        setNodesExplored(data.nodes_explored);
        setExecTime(data.execution_time_ms || 0);
        setStatus('Path Found');
        setAnimStep(0);
        setRobotPos({ r: fp[0][0], c: fp[0][1] });
        setAnimPhase('animating');
      } else {
        setPath([]);
        setVisited(data.visited_nodes || []);
        setFrontier(data.frontier_nodes || []);
        setPathLength(0);
        setNodesExplored(data.nodes_explored || 0);
        setExecTime(data.execution_time_ms || 0);
        setStatus('No Path Found');
        setAnimPhase('idle');
      }
    } catch {
      setStatus('Error');
    } finally {
      setRunning(false);
    }
  }, [rows, cols, start, goal, walls, selectedAlgo, movement]);

  // Run all comparison
  const runCompare = async () => {
    setRunning(true);
    setStatus('Comparing all...');
    try {
      const res = await fetch('/api/route/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows, cols,
          start: [start.r, start.c],
          goal: [goal.r, goal.c],
          obstacles: walls.map(w => [w.r, w.c]),
          movement
        })
      });
      const d = await res.json();
      if (d.mode === 'compare_all') {
        setComparison([
          { name: 'BFS', len: d.bfs?.total_distance || 0, nodes: d.bfs?.nodes_explored || 0, time: d.bfs?.execution_time_ms || 0, color: '#3b82f6' },
          { name: 'DFS', len: d.dfs?.total_distance || 0, nodes: d.dfs?.nodes_explored || 0, time: d.dfs?.execution_time_ms || 0, color: '#6366f1' },
          { name: 'Dijkstra', len: d.dijkstra?.total_distance || 0, nodes: d.dijkstra?.nodes_explored || 0, time: d.dijkstra?.execution_time_ms || 0, color: '#f59e0b' },
          { name: 'A*', len: d.astar?.total_distance || 0, nodes: d.astar?.nodes_explored || 0, time: d.astar?.execution_time_ms || 0, color: '#10b981' },
          { name: 'Greedy Best-First', len: d.greedy?.total_distance || 0, nodes: d.greedy?.nodes_explored || 0, time: d.greedy?.execution_time_ms || 0, color: '#ef4444' }
        ]);
        setStatus('Comparison Complete');
      }
    } catch {
      setStatus('Comparison Error');
    } finally {
      setRunning(false);
    }
  };

  const clearAnim = () => {
    setAnimPhase('idle');
    setRobotPos(null);
    setAnimStep(0);
    fullPathRef.current = [];
    setPath([]);
    setVisited([]);
    setFrontier([]);
    setPathLength(0);
    setNodesExplored(0);
    setStatus('Ready');
  };

  const handleCellClick = (r, c) => {
    if (editMode === 'start') {
      if (goal.r === r && goal.c === c) return;
      setStart({ r, c });
      setWalls(w => w.filter(x => !(x.r === r && x.c === c)));
      clearAnim();
    } else if (editMode === 'goal') {
      if (start.r === r && start.c === c) return;
      setGoal({ r, c });
      setWalls(w => w.filter(x => !(x.r === r && x.c === c)));
      clearAnim();
    } else if (editMode === 'wall') {
      if ((start.r === r && start.c === c) || (goal.r === r && goal.c === c)) return;
      setWalls(w => w.some(x => x.r === r && x.c === c) ? w.filter(x => !(x.r === r && x.c === c)) : [...w, { r, c }]);
      clearAnim();
    }
  };

  const handleReset = () => {
    setStart({ r: Math.floor(rows / 2), c: 2 });
    setGoal({ r: Math.floor(rows / 2), c: cols - 3 });
    const mid = Math.floor(cols / 2);
    const nw = [];
    for (let r = 2; r < rows - 2; r++) {
      if (r !== Math.floor(rows / 2)) nw.push({ r, c: mid });
    }
    setWalls(nw);
    setSelectedAlgo('A*');
    clearAnim();
  };

  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      runAlgorithm('A*');
    }
  }, [runAlgorithm]);

  const defaultTable = [
    { name: 'BFS', len: 29, nodes: 290, time: 0.68, color: '#3b82f6' },
    { name: 'DFS', len: 43, nodes: 175, time: 0.41, color: '#6366f1' },
    { name: 'Dijkstra', len: 29, nodes: 310, time: 0.92, color: '#f59e0b' },
    { name: 'A*', len: 29, nodes: 85, time: 0.42, color: '#10b981' },
    { name: 'Greedy Best-First', len: 35, nodes: 120, time: 0.36, color: '#ef4444' }
  ];
  const tableData = comparison || defaultTable;
  const currentInfo = ALGO_METRICS[selectedAlgo] || ALGO_METRICS['A*'];

  return (
    <div className="app-container">
      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="sidebar-left">
        {/* 1. Algorithm Selection */}
        <div className="card">
          <div className="card-header">Algorithm Selection</div>
          <select value={selectedAlgo} onChange={e => { setSelectedAlgo(e.target.value); runAlgorithm(e.target.value); }} className="select-primary">
            {ALGORITHMS.map(a => <option key={a} value={a}>{a === 'A*' ? '★ A*' : a}</option>)}
          </select>
          <div className="pill-grid">
            {ALGORITHMS.map(a => (
              <button
                key={a}
                onClick={() => { setSelectedAlgo(a); runAlgorithm(a); }}
                className={`pill-btn ${selectedAlgo === a ? 'active' : ''}`}
                style={a === 'Greedy Best-First' ? { gridColumn: 'span 2' } : {}}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="btn-stack">
            <button onClick={() => runAlgorithm(selectedAlgo)} disabled={running} className="btn-primary">
              <Play size={13} fill="currentColor" />
              <span>{running ? 'Running...' : 'Run Algorithm'}</span>
            </button>
            <button onClick={runCompare} disabled={running} className="btn-secondary">
              <ArrowRightLeft size={13} />
              <span>Compare All (5 Algos)</span>
            </button>
          </div>
        </div>

        {/* 2. Grid Settings */}
        <div className="card">
          <div className="card-header">Grid Settings</div>
          <div className="row-between">
            <span className="label-text">Grid Size</span>
            <select value={gridSize} onChange={e => { setGridSize(e.target.value); clearAnim(); }} className="select-sm">
              <option value="10x10">10 × 10</option>
              <option value="15x15">15 × 15</option>
              <option value="20x20">20 × 20</option>
              <option value="25x25">25 × 25</option>
            </select>
          </div>
          <div className="row-between">
            <span className="label-text">Movement</span>
            <select value={movement} onChange={e => setMovement(e.target.value)} className="select-sm">
              <option value="4-directional">4-directional</option>
              <option value="8-directional">8-directional</option>
            </select>
          </div>
          <div className="row-between">
            <span className="label-text">Movement Cost</span>
            <select value={movementCost} onChange={e => setMovementCost(e.target.value)} className="select-sm">
              <option value="Uniform">Uniform (1.0)</option>
              <option value="Weighted">Weighted</option>
            </select>
          </div>
        </div>

        {/* 3. Grid Editor */}
        <div className="card">
          <div className="card-header">Grid Editor</div>
          <div className="tool-grid">
            <button onClick={() => setEditMode('start')} className={`tool-btn tool-start ${editMode === 'start' ? 'active' : ''}`}>
              <Play size={11} fill="currentColor" /><span>Start</span>
            </button>
            <button onClick={() => setEditMode('goal')} className={`tool-btn tool-goal ${editMode === 'goal' ? 'active' : ''}`}>
              <Flag size={11} fill="currentColor" /><span>Goal</span>
            </button>
            <button onClick={() => setEditMode('wall')} className={`tool-btn tool-wall ${editMode === 'wall' ? 'active' : ''}`}>
              <Square size={11} fill="currentColor" /><span>Wall</span>
            </button>
          </div>
          <div className="tool-actions">
            <button onClick={() => { setWalls([]); clearAnim(); }} className="btn-ghost">
              <Trash2 size={12} /><span>Clear Walls</span>
            </button>
            <button onClick={handleReset} className="btn-ghost">
              <RotateCcw size={12} /><span>Reset Grid</span>
            </button>
          </div>
        </div>

        {/* 4. Display Layers */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Eye size={13} /><span>Display Layers</span>
          </div>
          <div className="check-grid">
            <label className="check-label"><input type="checkbox" checked={showPath} onChange={() => setShowPath(v => !v)} /><span>Optimal Path</span></label>
            <label className="check-label"><input type="checkbox" checked={showRobot} onChange={() => setShowRobot(v => !v)} /><span>Robot</span></label>
            <label className="check-label"><input type="checkbox" checked={showVisited} onChange={() => setShowVisited(v => !v)} /><span>Visited Nodes</span></label>
            <label className="check-label"><input type="checkbox" checked={showFrontier} onChange={() => setShowFrontier(v => !v)} /><span>Frontier</span></label>
          </div>
        </div>
      </aside>

      {/* ── Center Column ───────────────────────────────────────────────── */}
      <main className="main-center">
        <GridCanvas
          rows={rows}
          cols={cols}
          start={start}
          goal={goal}
          walls={walls}
          visited={showVisited ? visited : []}
          frontier={showFrontier ? frontier : []}
          path={showPath ? path : []}
          robotPos={showRobot ? robotPos : null}
          animStep={animStep}
          totalSteps={path.length > 0 ? path.length - 1 : 0}
          animPhase={animPhase}
          animSpeed={animSpeed}
          onAnimSpeedChange={setAnimSpeed}
          onPlay={handlePlay}
          onRestart={handleRestart}
          onPrevStep={handlePrevStep}
          onNextStep={handleNextStep}
          onSliderSeek={handleSeek}
          status={status}
          editMode={editMode}
          onCellClick={handleCellClick}
        />

        {/* Algorithm Comparison Table */}
        <div className="card comparison-card">
          <div className="card-header">Algorithm Comparison</div>
          <div className="table-wrapper">
            <table className="comp-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Path Length</th>
                  <th>Nodes Explored</th>
                  <th>Execution Time (ms)</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td className="mono">{r.len}</td>
                    <td className="mono">{r.nodes}</td>
                    <td className="mono" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="dot" style={{ background: r.color }} />
                      <span>{r.time}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-note">Illustrative values only; actual results will be calculated by the C++ engine.</p>
        </div>
      </main>

      {/* ── Right Sidebar ────────────────────────────────────────────────── */}
      <aside className="sidebar-right">
        {/* 1. Algorithm Information */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Algorithm Information</span>
            <span className="badge-status">
              <span className="pulse-dot" /><span>{status}</span>
            </span>
          </div>
          <div className="stat-list">
            <div className="row-between">
              <span className="label-text">Selected Algorithm</span>
              <span className="badge-algo">{selectedAlgo}</span>
            </div>
            <div className="row-between">
              <span className="label-text">Path Length</span>
              <span className="val-bold">{pathLength} steps</span>
            </div>
            <div className="row-between">
              <span className="label-text">Nodes Explored</span>
              <span className="val-bold">{nodesExplored}</span>
            </div>
            <div className="row-between">
              <span className="label-text">Execution Time</span>
              <span className="val-bold">{execTime} ms</span>
            </div>
          </div>
        </div>

        {/* 2. Complexity Analysis */}
        <div className="card">
          <div className="card-header">Complexity Analysis</div>
          <div className="comp-boxes">
            <div className="comp-box">
              <span className="comp-box-title">Time Complexity</span>
              <span className="comp-val val-green">{currentInfo.time}</span>
              <span className="comp-sub">{currentInfo.timeNote}</span>
            </div>
            <div className="comp-box">
              <span className="comp-box-title">Space Complexity</span>
              <span className="comp-val val-blue">{currentInfo.space}</span>
              <span className="comp-sub">{currentInfo.spaceNote}</span>
            </div>
          </div>
          <div className="alert-box">
            <Info size={13} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
            <span>Theoretical complexity is displayed separately from actual execution performance.</span>
          </div>
        </div>

        {/* 3. Selected Algorithm Details */}
        <div className="card" style={{ flex: 1 }}>
          <span className="details-header">★ SELECTED ALGORITHM DETAILS</span>
          <h3 className="details-title">{currentInfo.title}</h3>
          <p className="details-desc">{currentInfo.desc}</p>
          <div className="features-block">
            <span className="features-title">Key Features</span>
            {currentInfo.features.map((f, i) => (
              <div key={i} className="feature-row">
                <span className="check-icon"><Check size={10} strokeWidth={3} /></span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
