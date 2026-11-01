import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Flag, ArrowRight, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';

export default function GridCanvas({
  rows = 15,
  cols = 15,
  start = { r: 7, c: 2 },
  goal = { r: 7, c: 12 },
  walls = [],
  visited = [],
  frontier = [],
  path = [],
  robotPos = null,
  animStep = 0,
  totalSteps = 0,
  animPhase = 'idle',
  animSpeed = 1,
  onAnimSpeedChange,
  onPlay,
  onRestart,
  onPrevStep,
  onNextStep,
  onSliderSeek,
  status = 'Ready',
  editMode = 'wall',
  onCellClick
}) {
  const containerRef = useRef(null);
  const [cellSize, setCellSize] = useState(32);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Dynamically calculate cell size so grid fills available viewport space
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const availableW = width - 40;
          const availableH = height - 35;
          const maxCellW = Math.floor(availableW / cols);
          const maxCellH = Math.floor(availableH / rows);
          const size = Math.max(16, Math.min(maxCellW, maxCellH, 46));
          setCellSize(size);
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [rows, cols]);

  useEffect(() => {
    const handleMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const isStart = (r, c) => start && start.r === r && start.c === c;
  const isGoal = (r, c) => goal && goal.r === r && goal.c === c;
  const isWall = (r, c) => walls.some(w => w.r === r && w.c === c);
  const isPath = (r, c) => path.some(p => p[0] === r && p[1] === c);
  const isVisited = (r, c) => visited.some(v => v[0] === r && v[1] === c);
  const isFrontier = (r, c) => frontier.some(f => f[0] === r && f[1] === c);
  const isRobot = (r, c) => robotPos && robotPos.r === r && robotPos.c === c;

  const getPathArrow = (r, c) => {
    const idx = path.findIndex(p => p[0] === r && p[1] === c);
    if (idx === -1 || idx === path.length - 1) return null;
    const next = path[idx + 1];
    const dr = next[0] - r;
    const dc = next[1] - c;
    const sz = Math.max(10, Math.floor(cellSize * 0.45));
    if (dr > 0) return <ArrowDown size={sz} className="path-arrow" />;
    if (dr < 0) return <ArrowUp size={sz} className="path-arrow" />;
    if (dc > 0) return <ArrowRight size={sz} className="path-arrow" />;
    if (dc < 0) return <ArrowLeft size={sz} className="path-arrow" />;
    return null;
  };

  const statusColor = animPhase === 'completed' ? '#16a34a'
    : animPhase === 'animating' ? '#2563eb'
    : animPhase === 'paused' ? '#d97706'
    : '#64748b';

  const isPlaying = animPhase === 'animating';
  const hasPath = totalSteps > 0;

  return (
    <div className="card grid-card">
      {/* Top Animation Toolbar */}
      <div className="anim-toolbar">
        <div className="anim-btn-group">
          <button className="anim-btn" onClick={onRestart} disabled={!hasPath} title="Restart">
            <RotateCcw size={13} />
          </button>
          <button className="anim-btn" onClick={onPrevStep} disabled={!hasPath} title="Prev Step">
            <SkipBack size={13} />
          </button>
          <button className={`anim-btn anim-btn-play ${isPlaying ? 'playing' : ''}`} onClick={onPlay} disabled={!hasPath && animPhase === 'idle'} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          </button>
          <button className="anim-btn" onClick={onNextStep} disabled={!hasPath} title="Next Step">
            <SkipForward size={13} />
          </button>
        </div>

        <div className="anim-slider-group">
          <input
            type="range"
            min={0}
            max={Math.max(1, totalSteps)}
            value={animStep}
            onChange={e => onSliderSeek && onSliderSeek(e.target.value)}
            className="progress-slider"
          />
          <span className="step-counter">{animStep} / {totalSteps}</span>
        </div>

        <div className="anim-speed-group">
          <select value={animSpeed} onChange={e => onAnimSpeedChange && onAnimSpeedChange(Number(e.target.value))} className="speed-select">
            <option value={0.5}>0.5×</option>
            <option value={1}>1.0×</option>
            <option value={2}>2.0×</option>
            <option value={4}>4.0×</option>
          </select>
          <span className="status-pill" style={{ color: statusColor, background: statusColor + '15', border: `1px solid ${statusColor}40` }}>
            {status}
          </span>
        </div>
      </div>

      {/* Main Grid Interactive Workspace */}
      <div className="grid-workspace" ref={containerRef}>
        <div className="grid-matrix-layout">
          {/* Y Axis */}
          <div className="axis-y">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="axis-cell" style={{ height: `${cellSize}px` }}>{r + 1}</div>
            ))}
          </div>

          <div>
            {/* Grid Table */}
            <div
              className="grid-table"
              style={{
                gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${rows}, ${cellSize}px)`
              }}
            >
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => {
                  const cellStart = isStart(r, c);
                  const cellGoal = isGoal(r, c);
                  const cellWall = isWall(r, c);
                  const cellPath = isPath(r, c);
                  const cellVisited = isVisited(r, c);
                  const cellFrontier = isFrontier(r, c);
                  const cellRobot = isRobot(r, c);

                  let cellClass = 'cell cell-floor';
                  if (cellRobot) cellClass = 'cell cell-robot';
                  else if (cellStart) cellClass = 'cell cell-start';
                  else if (cellGoal) cellClass = 'cell cell-goal';
                  else if (cellWall) cellClass = 'cell cell-wall';
                  else if (cellPath) cellClass = 'cell cell-path';
                  else if (cellVisited) cellClass = 'cell cell-visited';
                  else if (cellFrontier) cellClass = 'cell cell-frontier';

                  const arrow = cellPath && !cellStart && !cellGoal && !cellRobot ? getPathArrow(r, c) : null;
                  const iconSize = Math.max(10, Math.floor(cellSize * 0.42));

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={cellClass}
                      style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                      onMouseDown={() => { setIsMouseDown(true); onCellClick(r, c); }}
                      onMouseEnter={() => { if (isMouseDown && editMode === 'wall') onCellClick(r, c); }}
                    >
                      {cellRobot && <span style={{ fontSize: `${Math.floor(cellSize * 0.55)}px` }}>🤖</span>}
                      {!cellRobot && cellStart && <Play size={iconSize} fill="currentColor" />}
                      {!cellRobot && cellGoal && <Flag size={iconSize} fill="currentColor" />}
                      {arrow}
                    </div>
                  );
                })
              )}
            </div>

            {/* X Axis */}
            <div className="axis-x">
              {Array.from({ length: cols }).map((_, c) => (
                <div key={c} className="axis-cell" style={{ width: `${cellSize}px` }}>{c + 1}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="grid-legend">
        <div className="legend-item"><span className="legend-dot dot-start" /><span>Start</span></div>
        <div className="legend-item"><span className="legend-dot dot-goal" /><span>Goal</span></div>
        <div className="legend-item"><span className="legend-dot dot-wall" /><span>Wall</span></div>
        <div className="legend-item"><span className="legend-dot dot-frontier" /><span>Frontier</span></div>
        <div className="legend-item"><span className="legend-dot dot-visited" /><span>Visited</span></div>
        <div className="legend-item"><span className="legend-dot dot-path" /><span>Path</span></div>
        <div className="legend-item"><span className="legend-dot dot-robot" /><span>Robot</span></div>
      </div>
    </div>
  );
}
