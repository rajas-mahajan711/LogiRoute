const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const ENGINE_PATH = path.resolve(__dirname, '../cpp-engine/routing_engine.exe');

app.use(cors());
app.use(express.json());

// C++ Engine Bridge with JS Fallback
function runEngine(payload) {
  return new Promise((resolve) => {
    if (!fs.existsSync(ENGINE_PATH)) return resolve(solveJS(payload));

    const child = spawn(ENGINE_PATH, [], { windowsHide: true });
    let stdout = '';

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.on('error', () => resolve(solveJS(payload)));
    child.on('close', code => {
      if (code !== 0 || !stdout) return resolve(solveJS(payload));
      try { resolve(JSON.parse(stdout.trim())); }
      catch { resolve(solveJS(payload)); }
    });

    try {
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    } catch {
      resolve(solveJS(payload));
    }
  });
}

// Built-in Pure JS Fallback Solver
function solveJS(payload) {
  const { rows = 15, cols = 15, start: s = [7, 2], goal: g = [7, 12], obstacles = [], algorithm = 'A*', movement = '4-directional' } = payload;
  const start = Array.isArray(s) ? { r: s[0], c: s[1] } : s;
  const goal = Array.isArray(g) ? { r: g[0], c: g[1] } : g;
  const obs = new Set(obstacles.map(o => `${Array.isArray(o) ? o[0] : o.r},${Array.isArray(o) ? o[1] : o.c}`));
  const dirs = movement === '8-directional'
    ? [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    : [[-1,0],[0,1],[1,0],[0,-1]];

  const isPassable = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && !obs.has(`${r},${c}`);
  const h = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

  function runOne(name) {
    const t0 = Date.now();
    const res = {
      algorithm: name, success: false, message: '', full_path: [], visited_nodes: [], frontier_nodes: [],
      total_distance: 0, nodes_explored: 0, execution_time_ms: 0.05,
      time_complexity: name === 'BFS' || name === 'DFS' ? 'O(V + E)' : name === 'Dijkstra' ? 'O(E + V log V)' : 'O(E)',
      space_complexity: 'O(V)'
    };
    if (!isPassable(start.r, start.c) || !isPassable(goal.r, goal.c)) {
      res.message = 'Start or Goal is blocked!';
      return res;
    }

    const parent = {};
    const visited = new Set();
    const frontier = [];
    let found = false;

    if (name === 'DFS') {
      const st = [start];
      visited.add(`${start.r},${start.c}`);
      while (st.length) {
        const u = st.pop();
        res.visited_nodes.push([u.r, u.c]);
        if (u.r === goal.r && u.c === goal.c) { found = true; break; }
        for (const [dr, dc] of dirs) {
          const nr = u.r + dr, nc = u.c + dc, k = `${nr},${nc}`;
          if (isPassable(nr, nc) && !visited.has(k)) {
            visited.add(k); parent[k] = u; frontier.push([nr, nc]); st.push({ r: nr, c: nc });
          }
        }
      }
    } else if (name === 'BFS') {
      const q = [start];
      visited.add(`${start.r},${start.c}`);
      while (q.length) {
        const u = q.shift();
        res.visited_nodes.push([u.r, u.c]);
        if (u.r === goal.r && u.c === goal.c) { found = true; break; }
        for (const [dr, dc] of dirs) {
          const nr = u.r + dr, nc = u.c + dc, k = `${nr},${nc}`;
          if (isPassable(nr, nc) && !visited.has(k)) {
            visited.add(k); parent[k] = u; frontier.push([nr, nc]); q.push({ r: nr, c: nc });
          }
        }
      }
    } else {
      const gScore = { [`${start.r},${start.c}`]: 0 };
      const closed = new Set();
      const open = [{ pt: start, g: 0, f: 0 }];
      const calcF = (gCost, pt) => name === 'Dijkstra' ? gCost : name === 'Greedy Best-First' ? h(pt, goal) : gCost + h(pt, goal);

      while (open.length) {
        open.sort((a, b) => a.f - b.f);
        const { pt: u, g: gCost } = open.shift();
        const k = `${u.r},${u.c}`;
        if (closed.has(k)) continue;
        closed.add(k);
        res.visited_nodes.push([u.r, u.c]);
        if (u.r === goal.r && u.c === goal.c) { found = true; break; }

        for (const [dr, dc] of dirs) {
          const nr = u.r + dr, nc = u.c + dc, nk = `${nr},${nc}`;
          if (!isPassable(nr, nc) || closed.has(nk)) continue;
          const tg = gCost + 1;
          if (gScore[nk] === undefined || tg < gScore[nk]) {
            gScore[nk] = tg; parent[nk] = u; frontier.push([nr, nc]);
            open.push({ pt: { r: nr, c: nc }, g: tg, f: calcF(tg, { r: nr, c: nc }) });
          }
        }
      }
    }

    res.nodes_explored = res.visited_nodes.length;
    res.frontier_nodes = frontier;
    if (found) {
      const full = [];
      let ck = `${goal.r},${goal.c}`;
      while (ck) {
        const [r, c] = ck.split(',').map(Number);
        full.push([r, c]);
        const p = parent[ck];
        ck = p ? `${p.r},${p.c}` : null;
      }
      res.full_path = full.reverse();
      res.total_distance = res.full_path.length - 1;
      res.success = true;
      res.message = 'Path found successfully!';
    } else {
      res.message = 'No path found.';
    }
    res.execution_time_ms = Math.max(0.02, (Date.now() - t0));
    return res;
  }

  if (algorithm === 'compare_all') {
    return {
      mode: 'compare_all',
      astar: runOne('A*'),
      bfs: runOne('BFS'),
      dfs: runOne('DFS'),
      dijkstra: runOne('Dijkstra'),
      greedy: runOne('Greedy Best-First')
    };
  }
  return runOne(algorithm);
}

// Endpoints
app.get('/api/health', (req, res) => res.json({ status: 'ONLINE', timestamp: new Date().toISOString() }));

// Root landing page to guide users visiting port 5000 directly
const frontendDist = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('/', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LogiRoute AI API</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          h1 { color: #38bdf8; margin-top: 0; font-size: 1.5rem; }
          p { color: #94a3b8; line-height: 1.6; }
          .btn { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #2563eb; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 600; transition: background 0.2s; }
          .btn:hover { background: #1d4ed8; }
          .badge { display: inline-block; padding: 0.25rem 0.75rem; background: #10b98122; color: #34d399; border-radius: 9999px; font-size: 0.85rem; margin-bottom: 1rem; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">● Backend Online (Port 5000)</span>
          <h1>LogiRoute AI Coordinator</h1>
          <p>This is the backend API & C++ bridge service. Open the interactive visualizer dashboard below:</p>
          <a class="btn" href="http://localhost:5173" target="_blank">Open Visualizer (Port 5173) &rarr;</a>
          <p style="font-size: 0.85rem; margin-top: 1.5rem;"><a href="/api/health" style="color: #64748b; text-decoration: none;">View API Health Check JSON</a></p>
        </div>
      </body>
      </html>
    `);
  });
}

app.post('/api/route/solve', async (req, res) => {
  try {
    const result = await runEngine(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/route/compare', async (req, res) => {
  try {
    const result = await runEngine({ ...req.body, algorithm: 'compare_all' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log(`LogiRoute Backend active at http://localhost:${PORT}`));
