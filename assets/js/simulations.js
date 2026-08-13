/* ============================================================
   Senior Engineer Academy — Shared Simulation Engine
   ============================================================ */

"use strict";

// ── Utility helpers ──────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(n);

function log(container, msg, type = 'info') {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  const line = document.createElement('div');
  line.className = `log-${type}`;
  const ts = new Date().toISOString().substr(11, 8);
  line.textContent = `[${ts}] ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  // Keep last 100 lines
  while (el.children.length > 100) el.removeChild(el.firstChild);
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = typeof value === 'number' ? fmt(value) : value;
}

// ── Consistent Hashing Ring ───────────────────────────────────
class ConsistentHashingRing {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.nodes = [];
    this.keys = [];
    this.vnodes = 3;
    this.running = false;
    if (this.canvas) this.draw();
  }

  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0x7fffffff;
    return h % 360;
  }

  addNode(name) {
    const positions = [];
    for (let v = 0; v < this.vnodes; v++) {
      positions.push(this.hash(`${name}-vnode-${v}`));
    }
    this.nodes.push({ name, positions, color: this._nodeColor(this.nodes.length) });
    log(this.logId, `Added node ${name} with ${this.vnodes} virtual nodes`, 'ok');
    this.draw();
    this._rebalanceLog();
  }

  removeNode(name) {
    const idx = this.nodes.findIndex(n => n.name === name);
    if (idx === -1) return;
    this.nodes.splice(idx, 1);
    log(this.logId, `Removed node ${name}`, 'warn');
    this.draw();
    this._rebalanceLog();
  }

  addKey(key) {
    const pos = this.hash(key);
    this.keys.push({ key, pos });
    const owner = this._findOwner(pos);
    log(this.logId, `Key "${key}" (pos=${pos}°) → ${owner}`, 'info');
    this.draw();
  }

  _findOwner(pos) {
    if (!this.nodes.length) return 'none';
    let allPositions = [];
    this.nodes.forEach(n => n.positions.forEach(p => allPositions.push({ pos: p, name: n.name })));
    allPositions.sort((a, b) => a.pos - b.pos);
    for (const vn of allPositions) {
      if (vn.pos >= pos) return vn.name;
    }
    return allPositions[0]?.name || 'none';
  }

  _rebalanceLog() {
    if (this.nodes.length > 0) {
      const load = Math.round(100 / this.nodes.length);
      log(this.logId, `Expected load per node: ~${load}% (${this.nodes.length} nodes)`, 'info');
    }
  }

  _nodeColor(idx) {
    const colors = ['#ef5350','#42a5f5','#66bb6a','#ffca28','#ab47bc','#26c6da','#ff7043'];
    return colors[idx % colors.length];
  }

  draw() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    const W = this.canvas.width = this.canvas.offsetWidth;
    const H = this.canvas.height = 280;
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38;
    ctx.clearRect(0, 0, W, H);

    // Ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Virtual nodes
    this.nodes.forEach(node => {
      node.positions.forEach(pos => {
        const angle = (pos / 360) * Math.PI * 2 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name[0], x, y);
      });
    });

    // Keys
    this.keys.forEach(({ key, pos }) => {
      const angle = (pos / 360) * Math.PI * 2 - Math.PI / 2;
      const kr = r * 0.72;
      const x = cx + kr * Math.cos(angle);
      const y = cy + kr * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe082';
      ctx.fill();
    });

    // Legend
    ctx.textAlign = 'left';
    ctx.font = '11px monospace';
    this.nodes.forEach((node, i) => {
      ctx.fillStyle = node.color;
      ctx.fillRect(10, 10 + i * 16, 10, 10);
      ctx.fillStyle = '#ccc';
      ctx.fillText(node.name, 26, 19 + i * 16);
    });
  }
}

// ── Kafka Simulation ──────────────────────────────────────────
class KafkaSimulator {
  constructor(containerId, logId) {
    this.container = document.getElementById(containerId);
    this.logId = logId;
    this.partitions = 3;
    this.consumers = 3;
    this.producerRate = 100; // msgs/s
    this.offsets = [0, 0, 0];
    this.consumerOffsets = [];
    this.killed = new Set();
    this.running = false;
    this.interval = null;
    this._initOffsets();
    this.render();
  }

  _initOffsets() {
    this.consumerOffsets = Array.from({ length: this.consumers }, () =>
      Array(this.partitions).fill(0));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => this._tick(), 500);
    log(this.logId, 'Producer started — 100 msg/s', 'ok');
  }

  stop() {
    this.running = false;
    clearInterval(this.interval);
    log(this.logId, 'Producer stopped', 'warn');
  }

  _tick() {
    // Distribute messages across partitions
    const msgsPerTick = Math.ceil(this.producerRate / 10);
    for (let i = 0; i < this.partitions; i++) {
      const msgs = Math.floor(msgsPerTick / this.partitions) + (i === 0 ? msgsPerTick % this.partitions : 0);
      this.offsets[i] += msgs;
    }
    // Consumers consume
    const activeCons = Array.from({ length: this.consumers }, (_, i) => i)
      .filter(c => !this.killed.has(c));
    if (activeCons.length > 0) {
      // Assign partitions to consumers (simple round-robin)
      this.partitions > 0 && Array.from({ length: this.partitions }, (_, p) => {
        const c = activeCons[p % activeCons.length];
        const lag = this.offsets[p] - this.consumerOffsets[c][p];
        const consume = Math.min(lag, Math.ceil(msgsPerTick / this.partitions) + 5);
        this.consumerOffsets[c][p] += consume;
      });
    }
    this.render();
  }

  killConsumer(idx) {
    this.killed.add(idx);
    log(this.logId, `Consumer C${idx} killed — rebalancing triggered`, 'err');
    setTimeout(() => {
      log(this.logId, `Rebalance complete: partitions reassigned to remaining consumers`, 'warn');
      this.render();
    }, 600);
    this.render();
  }

  reviveConsumer(idx) {
    this.killed.delete(idx);
    log(this.logId, `Consumer C${idx} rejoined — rebalancing triggered`, 'ok');
    this.render();
  }

  render() {
    if (!this.container) return;
    const lags = Array.from({ length: this.partitions }, (_, p) => {
      const allLag = Array.from({ length: this.consumers }, (_, c) =>
        Math.max(0, this.offsets[p] - this.consumerOffsets[c][p]));
      return Math.min(...allLag);
    });
    const totalLag = lags.reduce((a, b) => a + b, 0);
    setStat('kafka-total-lag', totalLag);
    setStat('kafka-throughput', this.producerRate);
    setStat('kafka-partitions', this.partitions);
    const alive = this.consumers - this.killed.size;
    setStat('kafka-consumers', alive + '/' + this.consumers);
  }

  addPartition() {
    this.offsets.push(0);
    this.partitions++;
    this.consumerOffsets.forEach(co => co.push(0));
    log(this.logId, `Partition P${this.partitions - 1} added — total: ${this.partitions}`, 'ok');
    this.render();
  }
}

// ── Cache Stampede Simulation ─────────────────────────────────
class CacheStampedeSimulator {
  constructor(containerId, logId) {
    this.container = document.getElementById(containerId);
    this.logId = logId;
    this.clients = 100;
    this.cacheHit = true;
    this.dbLatency = 50;
    this.strategy = 'none'; // none | lock | jitter | stale
    this.dbLoad = 0;
    this.cacheLoad = 0;
    this.running = false;
  }

  expireKey() {
    this.cacheHit = false;
    log(this.logId, `Hot cache key EXPIRED — ${this.clients} clients will miss cache`, 'err');
    this._simulate();
  }

  _simulate() {
    if (this.strategy === 'none') {
      this.dbLoad = this.clients;
      log(this.logId, `STAMPEDE: ${this.clients} simultaneous DB queries! DB overloaded`, 'err');
      log(this.logId, `DB latency: ${this.dbLatency * 10}ms under stampede load`, 'err');
      setTimeout(() => {
        if (rand(0, 100) < 40) {
          log(this.logId, `DB CRASHED — cascading failure to upstream services`, 'err');
        }
        this.cacheHit = true;
        this.dbLoad = 1;
        log(this.logId, `Cache repopulated — back to normal`, 'ok');
        this._updateStats();
      }, 2000);
    } else if (this.strategy === 'lock') {
      this.dbLoad = 1;
      log(this.logId, `Mutex/lock: only 1 request goes to DB, others wait or serve stale`, 'ok');
      log(this.logId, `DB load: 1 query (vs ${this.clients} without lock)`, 'ok');
      setTimeout(() => { this.cacheHit = true; this._updateStats(); }, 800);
    } else if (this.strategy === 'jitter') {
      const waves = 5;
      this.dbLoad = Math.ceil(this.clients / waves);
      log(this.logId, `Jitter: requests spread across ${waves} waves (~${this.dbLoad} req/wave)`, 'ok');
      setTimeout(() => { this.cacheHit = true; this._updateStats(); }, 600);
    } else if (this.strategy === 'stale') {
      this.dbLoad = 1;
      log(this.logId, `Stale-while-revalidate: serving stale data instantly, refreshing in background`, 'ok');
      setTimeout(() => { this.cacheHit = true; this._updateStats(); }, 400);
    }
    this._updateStats();
  }

  _updateStats() {
    setStat('stampede-db-load', this.dbLoad);
    setStat('stampede-cache', this.cacheHit ? 'HIT' : 'MISS');
    setStat('stampede-clients', this.clients);
  }

  setStrategy(s) {
    this.strategy = s;
    log(this.logId, `Strategy set to: ${s}`, 'info');
  }
}

// ── Rate Limiter Simulation ───────────────────────────────────
class RateLimiterSimulator {
  constructor(containerId, logId) {
    this.container = document.getElementById(containerId);
    this.logId = logId;
    this.algorithm = 'token-bucket';
    this.rateLimit = 10;      // tokens/second
    this.burstCapacity = 20;  // max tokens
    this.tokens = 20;
    this.windowRequests = 0;
    this.windowStart = Date.now();
    this.allowed = 0;
    this.rejected = 0;
    this.interval = null;
    this.refillInterval = null;
  }

  start() {
    // Token refill
    this.refillInterval = setInterval(() => {
      if (this.algorithm === 'token-bucket') {
        this.tokens = Math.min(this.burstCapacity, this.tokens + this.rateLimit / 10);
      } else if (this.algorithm === 'fixed-window') {
        const now = Date.now();
        if (now - this.windowStart > 1000) {
          this.windowRequests = 0;
          this.windowStart = now;
        }
      }
      setStat('rl-tokens', Math.floor(this.tokens));
    }, 100);

    // Simulate incoming requests
    this.interval = setInterval(() => {
      const incoming = rand(5, 25);
      for (let i = 0; i < incoming; i++) {
        if (this._check()) {
          this.allowed++;
        } else {
          this.rejected++;
          if (this.rejected % 10 === 1) {
            log(this.logId, `Rate limit exceeded — request rejected (${this.rejected} total)`, 'warn');
          }
        }
      }
      setStat('rl-allowed', this.allowed);
      setStat('rl-rejected', this.rejected);
      setStat('rl-rate', (this.allowed / ((Date.now() - (this._startTime || (this._startTime = Date.now()))) / 1000)).toFixed(1));
    }, 200);

    log(this.logId, `Rate limiter started: ${this.algorithm}, limit=${this.rateLimit}/s`, 'ok');
  }

  _check() {
    if (this.algorithm === 'token-bucket') {
      if (this.tokens >= 1) { this.tokens--; return true; }
      return false;
    } else if (this.algorithm === 'sliding-window') {
      // Approximate sliding window
      return this.allowed / ((Date.now() - (this._startTime || Date.now())) / 1000 + 0.001) < this.rateLimit * 1.2;
    } else if (this.algorithm === 'fixed-window') {
      if (this.windowRequests < this.rateLimit) { this.windowRequests++; return true; }
      return false;
    }
    return false;
  }

  stop() {
    clearInterval(this.interval);
    clearInterval(this.refillInterval);
    log(this.logId, 'Rate limiter stopped', 'warn');
  }

  burst() {
    log(this.logId, `Burst injection: 200 requests in 100ms`, 'warn');
    let b = 200;
    const bi = setInterval(() => {
      if (b-- <= 0) { clearInterval(bi); return; }
      if (this._check()) this.allowed++; else this.rejected++;
      setStat('rl-allowed', this.allowed);
      setStat('rl-rejected', this.rejected);
    }, 0.5);
  }

  setAlgorithm(algo) {
    this.algorithm = algo;
    this.tokens = this.burstCapacity;
    this.windowRequests = 0;
    this.allowed = 0; this.rejected = 0;
    log(this.logId, `Algorithm changed to: ${algo}`, 'info');
  }
}

// ── DSA: Sliding Window Visualizer ───────────────────────────
class SlidingWindowViz {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.arr = [];
    this.left = 0; this.right = -1;
    this.target = 0;
    this.running = false;
    this.delay = 600;
  }

  init(arr, target) {
    this.arr = arr;
    this.target = target;
    this.left = 0; this.right = -1;
    this.running = false;
    this.render();
    this._log('Array initialized. Target sum: ' + target, 'info');
  }

  render(result = null) {
    if (!this.container) return;
    const arrDiv = document.getElementById('sw-array');
    if (!arrDiv) return;
    arrDiv.innerHTML = '';
    this.arr.forEach((val, i) => {
      const cell = document.createElement('div');
      cell.className = 'dsa-cell';
      if (i >= this.left && i <= this.right) cell.classList.add('window');
      if (i === this.left) cell.classList.add('active');
      if (i === this.right && i !== this.left) cell.classList.add('current');
      cell.textContent = val;
      arrDiv.appendChild(cell);
    });
    const info = document.getElementById('sw-info');
    if (info) {
      const windowSum = this.arr.slice(this.left, this.right + 1).reduce((a,b)=>a+b,0);
      info.textContent = `Window [${this.left}..${this.right}]  Sum=${windowSum}  Target=${this.target}` +
        (result !== null ? `  ✓ Found: [${result}]` : '');
    }
  }

  _log(msg, type) {
    const el = document.getElementById('sw-log');
    if (el) log(el, msg, type);
  }

  async runMaxSumSubarray(k) {
    if (this.running) return;
    this.running = true;
    this.left = 0; this.right = -1;
    let maxSum = -Infinity, windowSum = 0, bestL = 0;
    this._log(`Finding max sum subarray of length ${k}`, 'info');

    for (let i = 0; i < this.arr.length; i++) {
      this.right = i;
      windowSum += this.arr[i];
      if (i >= k) { windowSum -= this.arr[this.left]; this.left++; }
      if (i >= k - 1) {
        if (windowSum > maxSum) { maxSum = windowSum; bestL = this.left; }
        this._log(`Window [${this.left}..${this.right}] sum=${windowSum} best=${maxSum}`, windowSum === maxSum ? 'ok' : 'info');
      }
      this.render();
      await sleep(this.delay);
      if (!this.running) break;
    }
    this._log(`Max sum: ${maxSum} at [${bestL}..${bestL+k-1}]`, 'ok');
    this.running = false;
  }
}

// ── DSA: BFS/DFS Visualizer ───────────────────────────────────
class GraphViz {
  constructor(containerId, logId) {
    this.containerId = containerId;
    this.logId = logId;
    this.nodes = [];
    this.edges = [];
    this.running = false;
    this.delay = 700;
    this._buildDefaultGraph();
    this.render();
  }

  _buildDefaultGraph() {
    this.nodes = [
      { id: 0, label: 'A', x: 50, y: 50, state: 'unvisited' },
      { id: 1, label: 'B', x: 25, y: 65, state: 'unvisited' },
      { id: 2, label: 'C', x: 75, y: 65, state: 'unvisited' },
      { id: 3, label: 'D', x: 15, y: 80, state: 'unvisited' },
      { id: 4, label: 'E', x: 40, y: 80, state: 'unvisited' },
      { id: 5, label: 'F', x: 65, y: 80, state: 'unvisited' },
      { id: 6, label: 'G', x: 85, y: 80, state: 'unvisited' },
    ];
    this.edges = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]];
  }

  _adj(id) {
    return this.edges.filter(([a,b]) => a===id||b===id)
      .map(([a,b]) => a===id?b:a);
  }

  async bfs(startId = 0) {
    if (this.running) return;
    this.running = true;
    this.nodes.forEach(n => n.state = 'unvisited');
    const visited = new Set();
    const queue = [startId];
    const order = [];
    visited.add(startId);
    this.nodes[startId].state = 'queued';
    log(this.logId, `BFS start from ${this.nodes[startId].label}`, 'info');
    log(this.logId, `Queue: [${this.nodes[startId].label}]`, 'info');
    this.render();
    await sleep(this.delay);

    while (queue.length && this.running) {
      const id = queue.shift();
      this.nodes[id].state = 'current';
      order.push(this.nodes[id].label);
      log(this.logId, `Visit ${this.nodes[id].label} | order so far: ${order.join('→')}`, 'ok');
      this.render();
      await sleep(this.delay);

      for (const nb of this._adj(id)) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
          this.nodes[nb].state = 'queued';
          log(this.logId, `Enqueue ${this.nodes[nb].label} | queue: [${queue.map(i=>this.nodes[i].label).join(', ')}]`, 'info');
        }
      }
      this.nodes[id].state = 'visited';
      this.render();
      await sleep(this.delay / 2);
    }
    log(this.logId, `BFS complete: ${order.join(' → ')}`, 'ok');
    this.running = false;
  }

  async dfs(startId = 0) {
    if (this.running) return;
    this.running = true;
    this.nodes.forEach(n => n.state = 'unvisited');
    const visited = new Set();
    const order = [];
    log(this.logId, `DFS start from ${this.nodes[startId].label}`, 'info');

    const recurse = async (id, depth) => {
      if (!this.running) return;
      visited.add(id);
      this.nodes[id].state = 'current';
      order.push(this.nodes[id].label);
      log(this.logId, `${'  '.repeat(depth)}Visit ${this.nodes[id].label} (depth=${depth})`, 'ok');
      this.render();
      await sleep(this.delay);

      for (const nb of this._adj(id)) {
        if (!visited.has(nb)) {
          log(this.logId, `${'  '.repeat(depth)}→ recurse into ${this.nodes[nb].label}`, 'info');
          await recurse(nb, depth + 1);
        }
      }
      this.nodes[id].state = 'visited';
      this.render();
    };

    await recurse(startId, 0);
    log(this.logId, `DFS complete: ${order.join(' → ')}`, 'ok');
    this.running = false;
  }

  reset() {
    this.running = false;
    this.nodes.forEach(n => n.state = 'unvisited');
    this.render();
  }

  render() {
    const canvas = document.getElementById(this.containerId);
    if (!canvas) return;
    const W = canvas.width = canvas.offsetWidth || 600;
    const H = canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const stateColors = {
      unvisited: '#37474f', queued: '#f57f17', visited: '#1565c0',
      current: '#b71c1c', path: '#1b5e20'
    };

    // Edges
    this.edges.forEach(([a, b]) => {
      const na = this.nodes[a], nb = this.nodes[b];
      ctx.beginPath();
      ctx.moveTo(na.x / 100 * W, na.y / 100 * H);
      ctx.lineTo(nb.x / 100 * W, nb.y / 100 * H);
      ctx.strokeStyle = '#445';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Nodes
    this.nodes.forEach(node => {
      const x = node.x / 100 * W, y = node.y / 100 * H;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fillStyle = stateColors[node.state] || '#37474f';
      ctx.fill();
      ctx.strokeStyle = node.state === 'current' ? '#ef5350' : '#667';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, x, y);
    });
  }
}

// ── Auto-init simulations on page load ───────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Consistent hashing
  if (document.getElementById('ch-ring')) {
    window._ch = new ConsistentHashingRing('ch-ring', 'ch-log');
    ['N1','N2','N3'].forEach(n => window._ch.addNode(n));
    ['user:alice','user:bob','session:xyz','order:123'].forEach(k => window._ch.addKey(k));
  }

  // Kafka
  if (document.getElementById('kafka-canvas')) {
    window._kafka = new KafkaSimulator('kafka-canvas', 'kafka-log');
  }

  // Cache stampede
  if (document.getElementById('stampede-canvas')) {
    window._stampede = new CacheStampedeSimulator('stampede-canvas', 'stampede-log');
    window._stampede._updateStats();
  }

  // Rate limiter
  if (document.getElementById('rl-canvas')) {
    window._rl = new RateLimiterSimulator('rl-canvas', 'rl-log');
  }

  // Sliding window
  if (document.getElementById('sw-array')) {
    window._sw = new SlidingWindowViz('sw-array');
    window._sw.init([3,1,2,5,8,2,6,1,4,9,3], 11);
  }

  // BFS/DFS
  if (document.getElementById('graph-canvas')) {
    window._gv = new GraphViz('graph-canvas', 'graph-log');
  }
});
