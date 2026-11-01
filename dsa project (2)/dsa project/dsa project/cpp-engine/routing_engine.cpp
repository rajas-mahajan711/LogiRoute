#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <queue>
#include <stack>
#include <cmath>
#include <algorithm>
#include <chrono>
#include <iomanip>

using namespace std;

struct Point {
    int r = 0, c = 0;
    bool operator==(const Point& o) const { return r == o.r && c == o.c; }
    bool operator!=(const Point& o) const { return !(*this == o); }
};

struct RouteResult {
    string algorithm = "", message = "", time_complexity = "", space_complexity = "";
    bool success = false;
    vector<Point> full_path, visited_nodes, frontier_nodes;
    int total_distance = 0, nodes_explored = 0;
    double execution_time_ms = 0.0;
};

// Lightweight JSON Parser
struct Json {
    static int getInt(const string& s, const string& k, int def = 0) {
        size_t p = s.find("\"" + k + "\"");
        if (p == string::npos) return def;
        p = s.find(':', p);
        if (p == string::npos) return def;
        try { return stoi(s.substr(p + 1)); } catch (...) { return def; }
    }

    static string getString(const string& s, const string& k, const string& def = "") {
        size_t p = s.find("\"" + k + "\"");
        if (p == string::npos) return def;
        p = s.find(':', p);
        if (p == string::npos) return def;
        size_t q1 = s.find('"', p), q2 = s.find('"', q1 + 1);
        if (q1 == string::npos || q2 == string::npos) return def;
        return s.substr(q1 + 1, q2 - q1 - 1);
    }

    static Point getPoint(const string& s, const string& k1, const string& k2, Point def) {
        size_t p = s.find("\"" + k1 + "\"");
        if (p == string::npos && !k2.empty()) p = s.find("\"" + k2 + "\"");
        if (p == string::npos) return def;
        size_t ob = s.find('[', p);
        if (ob != string::npos) {
            size_t cb = s.find(']', ob);
            if (cb != string::npos) {
                stringstream ss(s.substr(ob + 1, cb - ob - 1));
                string t1, t2;
                if (getline(ss, t1, ',') && getline(ss, t2, ',')) {
                    try { return {stoi(t1), stoi(t2)}; } catch (...) {}
                }
            }
        }
        return def;
    }

    static vector<Point> getPointList(const string& s, const string& k) {
        vector<Point> pts;
        size_t p = s.find("\"" + k + "\"");
        if (p == string::npos) return pts;
        size_t ob = s.find('[', p);
        if (ob == string::npos) return pts;
        size_t i = ob + 1;
        while (i < s.size() && s[i] != ']') {
            if (s[i] == '[') {
                size_t cb = s.find(']', i);
                if (cb == string::npos) break;
                stringstream ss(s.substr(i + 1, cb - i - 1));
                string t1, t2;
                if (getline(ss, t1, ',') && getline(ss, t2, ',')) {
                    try { pts.push_back({stoi(t1), stoi(t2)}); } catch (...) {}
                }
                i = cb + 1;
            } else i++;
        }
        return pts;
    }
};

class Grid {
public:
    int rows, cols;
    vector<vector<bool>> blocked;

    Grid(int r, int c) : rows(r), cols(c), blocked(r, vector<bool>(c, false)) {}

    bool isPassable(int r, int c) const {
        return r >= 0 && r < rows && c >= 0 && c < cols && !blocked[r][c];
    }

    vector<Point> neighbors(const Point& p, bool eightDir) const {
        vector<Point> res;
        static const int dr4[4] = {-1, 0, 1, 0}, dc4[4] = {0, 1, 0, -1};
        static const int dr8[8] = {-1,-1,-1, 0, 0, 1, 1, 1}, dc8[8] = {-1, 0, 1,-1, 1,-1, 0, 1};
        int count = eightDir ? 8 : 4;
        const int* dr = eightDir ? dr8 : dr4;
        const int* dc = eightDir ? dc8 : dc4;
        for (int i = 0; i < count; ++i) {
            int nr = p.r + dr[i], nc = p.c + dc[i];
            if (isPassable(nr, nc)) res.push_back({nr, nc});
        }
        return res;
    }
};

static int manhattan(const Point& a, const Point& b) {
    return abs(a.r - b.r) + abs(a.c - b.c);
}

static void tracePath(RouteResult& res, const vector<vector<Point>>& parent, const Point& start, const Point& goal) {
    Point curr = goal;
    while (curr != start) {
        res.full_path.push_back(curr);
        curr = parent[curr.r][curr.c];
    }
    res.full_path.push_back(start);
    reverse(res.full_path.begin(), res.full_path.end());
    res.total_distance = res.full_path.size() - 1;
    res.success = true;
    res.message = "Path found successfully!";
}

RouteResult solve(const Grid& g, const Point& start, const Point& goal, const string& algo, bool eightDir) {
    auto t0 = chrono::high_resolution_clock::now();
    RouteResult res;
    res.algorithm = algo;

    if (!g.isPassable(start.r, start.c) || !g.isPassable(goal.r, goal.c)) {
        res.message = "Start or Goal is blocked!";
        return res;
    }

    vector<vector<Point>> parent(g.rows, vector<Point>(g.cols, {-1, -1}));
    vector<vector<bool>> visited(g.rows, vector<bool>(g.cols, false));
    bool found = false;

    if (algo == "DFS") {
        res.time_complexity = "O(V + E)"; res.space_complexity = "O(V)";
        stack<Point> st;
        st.push(start);
        visited[start.r][start.c] = true;
        while (!st.empty()) {
            Point u = st.top(); st.pop();
            res.visited_nodes.push_back(u);
            if (u == goal) { found = true; break; }
            for (const auto& v : g.neighbors(u, eightDir)) {
                if (!visited[v.r][v.c]) {
                    visited[v.r][v.c] = true;
                    parent[v.r][v.c] = u;
                    res.frontier_nodes.push_back(v);
                    st.push(v);
                }
            }
        }
    } else if (algo == "BFS") {
        res.time_complexity = "O(V + E)"; res.space_complexity = "O(V)";
        queue<Point> q;
        q.push(start);
        visited[start.r][start.c] = true;
        while (!q.empty()) {
            Point u = q.front(); q.pop();
            res.visited_nodes.push_back(u);
            if (u == goal) { found = true; break; }
            for (const auto& v : g.neighbors(u, eightDir)) {
                if (!visited[v.r][v.c]) {
                    visited[v.r][v.c] = true;
                    parent[v.r][v.c] = u;
                    res.frontier_nodes.push_back(v);
                    q.push(v);
                }
            }
        }
    } else {
        // Priority Queue (A*, Dijkstra, Greedy Best-First)
        bool isAStar = (algo == "A*"), isGreedy = (algo == "Greedy Best-First");
        res.time_complexity = isGreedy ? "O(V log V)" : isAStar ? "O(E)" : "O(E + V log V)";
        res.space_complexity = "O(V)";

        struct Node { Point pt; int g, f; bool operator>(const Node& o) const { return f > o.f; } };
        priority_queue<Node, vector<Node>, greater<Node>> pq;
        vector<vector<int>> gScore(g.rows, vector<int>(g.cols, 1e9));

        auto calcF = [&](int gVal, const Point& p) {
            return isGreedy ? manhattan(p, goal) : isAStar ? gVal + manhattan(p, goal) : gVal;
        };

        gScore[start.r][start.c] = 0;
        pq.push({start, 0, calcF(0, start)});

        while (!pq.empty()) {
            Node top = pq.top(); pq.pop();
            Point u = top.pt;
            if (visited[u.r][u.c]) continue;
            visited[u.r][u.c] = true;
            res.visited_nodes.push_back(u);
            if (u == goal) { found = true; break; }

            for (const auto& v : g.neighbors(u, eightDir)) {
                if (visited[v.r][v.c]) continue;
                int tg = gScore[u.r][u.c] + 1;
                if (tg < gScore[v.r][v.c]) {
                    gScore[v.r][v.c] = tg;
                    parent[v.r][v.c] = u;
                    res.frontier_nodes.push_back(v);
                    pq.push({v, tg, calcF(tg, v)});
                }
            }
        }
    }

    res.nodes_explored = res.visited_nodes.size();
    if (found) tracePath(res, parent, start, goal);
    else res.message = "No path found.";

    auto t1 = chrono::high_resolution_clock::now();
    res.execution_time_ms = chrono::duration<double, milli>(t1 - t0).count();
    if (res.execution_time_ms <= 0.0) res.execution_time_ms = 0.04;
    return res;
}

string serialize(const RouteResult& r) {
    stringstream ss;
    ss << fixed << setprecision(3);
    ss << "{\"algorithm\":\"" << r.algorithm << "\",\"success\":" << (r.success ? "true" : "false")
       << ",\"message\":\"" << r.message << "\",\"total_distance\":" << r.total_distance
       << ",\"nodes_explored\":" << r.nodes_explored << ",\"execution_time_ms\":" << r.execution_time_ms
       << ",\"time_complexity\":\"" << r.time_complexity << "\",\"space_complexity\":\"" << r.space_complexity << "\",\"full_path\":[";
    for (size_t i = 0; i < r.full_path.size(); ++i) {
        ss << "[" << r.full_path[i].r << "," << r.full_path[i].c << "]" << (i + 1 < r.full_path.size() ? "," : "");
    }
    ss << "],\"visited_nodes\":[";
    for (size_t i = 0; i < r.visited_nodes.size(); ++i) {
        ss << "[" << r.visited_nodes[i].r << "," << r.visited_nodes[i].c << "]" << (i + 1 < r.visited_nodes.size() ? "," : "");
    }
    ss << "],\"frontier_nodes\":[";
    for (size_t i = 0; i < r.frontier_nodes.size(); ++i) {
        ss << "[" << r.frontier_nodes[i].r << "," << r.frontier_nodes[i].c << "]" << (i + 1 < r.frontier_nodes.size() ? "," : "");
    }
    ss << "]}";
    return ss.str();
}

int main(int argc, char* argv[]) {
    string json, line;
    while (getline(cin, line)) json += line + "\n";
    if (json.empty() && argc > 1) json = argv[1];

    int rows = Json::getInt(json, "rows", 15), cols = Json::getInt(json, "cols", 15);
    Point start = Json::getPoint(json, "start", "dock", {rows / 2, 2});
    Point goal = Json::getPoint(json, "goal", "dropoff", {rows / 2, cols - 3});
    string algo = Json::getString(json, "algorithm", "A*");
    bool eightDir = (Json::getString(json, "movement", "4-directional") == "8-directional");

    Grid g(rows, cols);
    for (const auto& obs : Json::getPointList(json, "obstacles")) g.blocked[obs.r][obs.c] = true;

    if (algo == "compare_all") {
        cout << "{\"mode\":\"compare_all\","
             << "\"astar\":" << serialize(solve(g, start, goal, "A*", eightDir)) << ","
             << "\"bfs\":" << serialize(solve(g, start, goal, "BFS", eightDir)) << ","
             << "\"dfs\":" << serialize(solve(g, start, goal, "DFS", eightDir)) << ","
             << "\"dijkstra\":" << serialize(solve(g, start, goal, "Dijkstra", eightDir)) << ","
             << "\"greedy\":" << serialize(solve(g, start, goal, "Greedy Best-First", eightDir)) << "}" << endl;
    } else {
        cout << serialize(solve(g, start, goal, algo, eightDir)) << endl;
    }
    return 0;
}
