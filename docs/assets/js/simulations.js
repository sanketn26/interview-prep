/* ============================================================
   Senior Engineer Academy — Shared Simulation Engine
   All 15 priority sims + DSA visualizers. No backend.
   ============================================================ */

"use strict";

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt = n => {
  if (typeof n !== "number" || Number.isNaN(n)) return String(n);
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
  if (abs >= 10 || Number.isInteger(n)) return String(Math.round(n));
  return n.toFixed(2);
};

function log(container, msg, type = "info") {
  const el = typeof container === "string" ? document.getElementById(container) : container;
  if (!el) return;
  const line = document.createElement("div");
  line.className = `log-${type}`;
  const ts = new Date().toISOString().substr(11, 8);
  line.textContent = `[${ts}] ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 80) el.removeChild(el.firstChild);
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = typeof value === "number" ? fmt(value) : value;
}

function sizeCanvas(canvas, h = 240) {
  if (!canvas) return null;
  const dpr = window.devicePixelRatio || 1;
  const W = Math.max(280, canvas.clientWidth || canvas.offsetWidth || 600);
  const H = h;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H };
}

function clearCanvas(ctx, W, H) {
  ctx.fillStyle = "#111122";
  ctx.fillRect(0, 0, W, H);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Consistent Hashing Ring ───────────────────────────────────
class ConsistentHashingRing {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.nodes = [];
    this.keys = [];
    this.vnodes = 3;
    this._seed();
  }

  _seed() {
    this.nodes = [];
    this.keys = [];
    ["N1", "N2", "N3"].forEach(n => this.addNode(n, true));
    ["user:alice", "user:bob", "session:xyz", "order:123"].forEach(k => this.addKey(k, true));
    log(this.logId, "Ring reset — 3 nodes, 4 keys. Add/remove a node and watch only a slice remap.", "info");
    this.draw();
  }

  reset() { this._seed(); }

  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0x7fffffff;
    return h % 360;
  }

  addNode(name, quiet) {
    const positions = [];
    for (let v = 0; v < this.vnodes; v++) positions.push(this.hash(`${name}-vnode-${v}`));
    this.nodes.push({ name, positions, color: this._nodeColor(this.nodes.length) });
    if (!quiet) log(this.logId, `Added ${name} (${this.vnodes} vnodes) — only keys between this vnode and the previous owner remapped`, "ok");
    this.draw();
  }

  removeNode(name) {
    const idx = this.nodes.findIndex(n => n.name === name);
    if (idx === -1) return;
    this.nodes.splice(idx, 1);
    log(this.logId, `Removed ${name} — its keys walk clockwise to the next vnode`, "warn");
    this.draw();
  }

  addKey(key, quiet) {
    const pos = this.hash(key);
    this.keys.push({ key, pos });
    if (!quiet) log(this.logId, `Key "${key}" @ ${pos}° → ${this._findOwner(pos)}`, "info");
    this.draw();
  }

  _findOwner(pos) {
    if (!this.nodes.length) return "none";
    const all = [];
    this.nodes.forEach(n => n.positions.forEach(p => all.push({ pos: p, name: n.name })));
    all.sort((a, b) => a.pos - b.pos);
    for (const vn of all) if (vn.pos >= pos) return vn.name;
    return all[0].name;
  }

  _nodeColor(idx) {
    return ["#ef5350", "#42a5f5", "#66bb6a", "#ffca28", "#ab47bc", "#26c6da", "#ff7043"][idx % 7];
  }

  draw() {
    const sized = sizeCanvas(this.canvas, 280);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const cx = W / 2, cy = H / 2 + 8, r = Math.min(W, H) * 0.36;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#445";
    ctx.lineWidth = 2;
    ctx.stroke();

    this.nodes.forEach(node => {
      node.positions.forEach(pos => {
        const angle = (pos / 360) * Math.PI * 2 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.name.replace("N", ""), x, y);
      });
    });

    this.keys.forEach(({ key, pos }) => {
      const angle = (pos / 360) * Math.PI * 2 - Math.PI / 2;
      const x = cx + r * 0.7 * Math.cos(angle);
      const y = cy + r * 0.7 * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe082";
      ctx.fill();
    });

    ctx.textAlign = "left";
    ctx.font = "11px monospace";
    this.nodes.forEach((node, i) => {
      ctx.fillStyle = node.color;
      ctx.fillRect(10, 10 + i * 16, 10, 10);
      const owned = this.keys.filter(k => this._findOwner(k.pos) === node.name).length;
      ctx.fillStyle = "#ccc";
      ctx.fillText(`${node.name}  keys=${owned}`, 26, 19 + i * 16);
    });
    setStat("ch-nodes", this.nodes.length);
    setStat("ch-keys", this.keys.length);
  }
}

// ── Kafka Simulation ──────────────────────────────────────────
class KafkaSimulator {
  constructor(containerId, logId) {
    this.container = document.getElementById(containerId) || document.getElementById("kafka-canvas");
    this.logId = logId;
    if (this.container && this.container.tagName !== "CANVAS") {
      const c = document.createElement("canvas");
      c.id = "kafka-canvas-inner";
      c.className = "sim-canvas";
      c.style.width = "100%";
      c.style.height = "220px";
      this.container.appendChild(c);
      this.canvas = c;
    } else {
      this.canvas = this.container;
    }
    this.reset(true);
  }

  reset(quiet) {
    this.stop();
    this.partitions = 3;
    this.consumers = 3;
    this.producerRate = 120;
    this.offsets = [0, 0, 0];
    this.committed = [0, 0, 0];
    this.assignment = [0, 1, 2];
    this.killed = new Set();
    this.hotKey = false;
    if (!quiet) log(this.logId, "Reset: 3 partitions, 3 consumers. Extra consumers in a group add no parallelism.", "info");
    this.render();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => this._tick(), 400);
    log(this.logId, `Producer ${this.producerRate} msg/s — each partition has one owner in the group`, "ok");
  }

  stop() {
    this.running = false;
    clearInterval(this.interval);
  }

  pause() { this.stop(); log(this.logId, "Paused", "warn"); }

  _reassign() {
    const alive = [...Array(this.consumers).keys()].filter(c => !this.killed.has(c));
    this.assignment = Array(this.partitions).fill(-1);
    if (!alive.length) return;
    for (let p = 0; p < this.partitions; p++) this.assignment[p] = alive[p % alive.length];
  }

  _tick() {
    const per = Math.ceil(this.producerRate / 10);
    for (let p = 0; p < this.partitions; p++) {
      const bias = this.hotKey && p === 0 ? 4 : 1;
      this.offsets[p] += Math.floor((per / this.partitions) * bias);
    }
    this._reassign();
    for (let p = 0; p < this.partitions; p++) {
      const c = this.assignment[p];
      if (c < 0) continue;
      const lag = this.offsets[p] - this.committed[p];
      this.committed[p] += Math.min(lag, Math.ceil(per / this.partitions) + 3);
    }
    this.render();
  }

  killConsumer(idx) {
    this.killed.add(idx);
    log(this.logId, `C${idx} dead — stop-the-world rebalance, remaining consumers take extra partitions`, "err");
    this._reassign();
    this.render();
  }

  reviveConsumer(idx) {
    this.killed.delete(idx);
    log(this.logId, `C${idx} rejoined — rebalance again`, "ok");
    this._reassign();
    this.render();
  }

  addPartition() {
    this.offsets.push(0);
    this.committed.push(0);
    this.partitions++;
    this._reassign();
    log(this.logId, `P${this.partitions - 1} added. Consumers > partitions still idle — max parallelism = partitions.`, "ok");
    this.render();
  }

  addConsumer() {
    this.consumers++;
    this._reassign();
    const alive = this.consumers - this.killed.size;
    if (alive > this.partitions) {
      log(this.logId, `C${this.consumers - 1} joined but is idle — group parallelism capped at ${this.partitions} partitions`, "warn");
    } else {
      log(this.logId, `C${this.consumers - 1} joined — a partition was reassigned`, "ok");
    }
    this.render();
  }

  setHotKey(on) {
    this.hotKey = on;
    log(this.logId, on ? "Hot key: 70% of produce hits P0 — one consumer saturates, others idle" : "Hot key cleared", on ? "err" : "ok");
  }

  render() {
    this._reassign();
    const lags = this.offsets.map((o, p) => Math.max(0, o - this.committed[p]));
    setStat("kafka-total-lag", lags.reduce((a, b) => a + b, 0));
    setStat("kafka-throughput", this.producerRate);
    setStat("kafka-partitions", this.partitions);
    setStat("kafka-consumers", `${this.consumers - this.killed.size}/${this.consumers}`);

    const canvas = this.canvas && this.canvas.getContext ? this.canvas : null;
    if (!canvas) return;
    const sized = sizeCanvas(canvas, 220);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const pw = (W - 24) / this.partitions;
    for (let p = 0; p < this.partitions; p++) {
      const x = 12 + p * pw;
      const load = this.hotKey && p === 0 ? 0.85 : 0.35 + (lags[p] > 50 ? 0.3 : 0);
      ctx.fillStyle = load > 0.7 ? "#6d1b1b" : "#1b2a4a";
      roundRect(ctx, x + 4, 16, pw - 10, H - 32, 8);
      ctx.fill();
      ctx.fillStyle = "#90caf9";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`P${p}`, x + pw / 2, 36);
      ctx.fillStyle = "#ffe082";
      ctx.fillText(`log ${this.offsets[p]}`, x + pw / 2, 56);
      ctx.fillStyle = "#a5d6a7";
      ctx.fillText(`cmt ${this.committed[p]}`, x + pw / 2, 74);
      const owner = this.assignment[p];
      ctx.fillStyle = owner < 0 ? "#ef9a9a" : "#ce93d8";
      ctx.fillText(owner < 0 ? "unassigned" : `→ C${owner}`, x + pw / 2, 100);
      ctx.fillStyle = "#9e9ec8";
      ctx.fillText(`lag ${lags[p]}`, x + pw / 2, 122);
    }
  }
}

// ── Cache Stampede ────────────────────────────────────────────
class CacheStampedeSimulator {
  constructor(containerId, logId) {
    this.container = document.getElementById(containerId);
    this.logId = logId;
    this.clients = 100;
    this.reset();
  }

  reset() {
    this.cacheHit = true;
    this.dbLatency = 50;
    this.strategy = "none";
    this.dbLoad = 1;
    this._updateStats();
    log(this.logId, "Cache warm. Expire the hot key to stampede the DB — then switch strategy.", "info");
  }

  expireKey() {
    this.cacheHit = false;
    log(this.logId, `Hot key expired — ${this.clients} concurrent misses`, "err");
    this._simulate();
  }

  _simulate() {
    if (this.strategy === "none") {
      this.dbLoad = this.clients;
      log(this.logId, `STAMPEDE: ${this.clients} identical queries. Latency ×10, 40% chance the DB falls over`, "err");
      setTimeout(() => {
        if (rand(0, 100) < 40) log(this.logId, "DB crashed — stampede became a cascading outage", "err");
        this.cacheHit = true;
        this.dbLoad = 1;
        log(this.logId, "Cache eventually warm again — the outage already happened", "ok");
        this._updateStats();
      }, 1600);
    } else if (this.strategy === "lock") {
      this.dbLoad = 1;
      log(this.logId, "Single-flight / lock: 1 DB query, others wait. Cost: lock contention + herd when lock drops", "ok");
      setTimeout(() => { this.cacheHit = true; this._updateStats(); }, 700);
    } else if (this.strategy === "jitter") {
      this.dbLoad = Math.ceil(this.clients / 5);
      log(this.logId, `TTL jitter: expiry smeared — ~${this.dbLoad} queries/wave, not ${this.clients}`, "ok");
      setTimeout(() => { this.cacheHit = true; this._updateStats(); }, 600);
    } else {
      this.dbLoad = 1;
      log(this.logId, "Stale-while-revalidate: serve stale instantly, 1 background refresh", "ok");
      setTimeout(() => { this.cacheHit = true; this._updateStats(); }, 400);
    }
    this._updateStats();
  }

  _updateStats() {
    setStat("stampede-db-load", this.dbLoad);
    setStat("stampede-cache", this.cacheHit ? "HIT" : "MISS");
    setStat("stampede-clients", this.clients);
  }

  setStrategy(s) {
    this.strategy = s;
    log(this.logId, `Strategy: ${s}`, "info");
  }
}

// ── Rate Limiter ──────────────────────────────────────────────
class RateLimiterSimulator {
  constructor(containerId, logId) {
    this.container = document.getElementById(containerId);
    this.logId = logId;
    this.algorithm = "token-bucket";
    this.rateLimit = 10;
    this.burstCapacity = 20;
    this.reset();
  }

  reset() {
    this.stop();
    this.tokens = this.burstCapacity;
    this.windowRequests = 0;
    this.windowStart = Date.now();
    this.allowed = 0;
    this.rejected = 0;
    this._startTime = Date.now();
    setStat("rl-tokens", Math.floor(this.tokens));
    setStat("rl-allowed", 0);
    setStat("rl-rejected", 0);
    setStat("rl-rate", 0);
    log(this.logId, `${this.algorithm}: ${this.rateLimit}/s, burst ${this.burstCapacity}. Burst to see which algorithm is unfair at a window edge.`, "info");
  }

  start() {
    if (this.interval) return;
    this._startTime = Date.now();
    this.refillInterval = setInterval(() => {
      if (this.algorithm === "token-bucket") {
        this.tokens = Math.min(this.burstCapacity, this.tokens + this.rateLimit / 10);
      } else if (this.algorithm === "fixed-window") {
        if (Date.now() - this.windowStart > 1000) {
          this.windowRequests = 0;
          this.windowStart = Date.now();
        }
      }
      setStat("rl-tokens", Math.floor(this.tokens));
    }, 100);

    this.interval = setInterval(() => {
      const incoming = rand(4, 18);
      for (let i = 0; i < incoming; i++) {
        if (this._check()) this.allowed++;
        else {
          this.rejected++;
          if (this.rejected % 12 === 1) log(this.logId, `Reject (${this.rejected}) — ${this.algorithm} empty`, "warn");
        }
      }
      setStat("rl-allowed", this.allowed);
      setStat("rl-rejected", this.rejected);
      const elapsed = (Date.now() - this._startTime) / 1000;
      setStat("rl-rate", (this.allowed / Math.max(elapsed, 0.2)).toFixed(1));
    }, 200);
    log(this.logId, `Limiter running (${this.algorithm})`, "ok");
  }

  _check() {
    if (this.algorithm === "token-bucket") {
      if (this.tokens >= 1) { this.tokens--; return true; }
      return false;
    }
    if (this.algorithm === "sliding-window") {
      const rate = this.allowed / ((Date.now() - this._startTime) / 1000 + 0.001);
      return rate < this.rateLimit * 1.15;
    }
    if (this.windowRequests < this.rateLimit) { this.windowRequests++; return true; }
    return false;
  }

  stop() {
    clearInterval(this.interval);
    clearInterval(this.refillInterval);
    this.interval = this.refillInterval = null;
  }

  pause() { this.stop(); log(this.logId, "Paused", "warn"); }

  burst() {
    log(this.logId, "Burst: 200 requests", "warn");
    for (let i = 0; i < 200; i++) {
      if (this._check()) this.allowed++; else this.rejected++;
    }
    setStat("rl-allowed", this.allowed);
    setStat("rl-rejected", this.rejected);
    setStat("rl-tokens", Math.floor(this.tokens));
  }

  setAlgorithm(algo) {
    this.algorithm = algo;
    this.reset();
    log(this.logId, `Algorithm: ${algo}`, "info");
  }
}

// ── Sharding ──────────────────────────────────────────────────
class ShardingSimulator {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.reset();
  }

  reset() {
    this.stop();
    this.n = 4;
    this.counts = Array(4).fill(0);
    this.hot = false;
    this.writes = 0;
    log(this.logId, "4 hash shards, even keys. Inject a hot key to see one shard melt while others idle.", "info");
    this.render();
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => {
      for (let i = 0; i < 24; i++) {
        let s;
        if (this.hot && Math.random() < 0.7) s = 0;
        else s = rand(0, this.n - 1);
        this.counts[s]++;
        this.writes++;
      }
      this.render();
    }, 250);
    log(this.logId, "Write load on", "ok");
  }

  pause() { this.stop(); log(this.logId, "Paused", "warn"); }
  stop() { this.running = false; clearInterval(this.interval); }

  addShard() {
    this.n++;
    this.counts.push(0);
    log(this.logId, `Shard ${this.n - 1} added. Hash % N remaps almost every key — this is why consistent hashing exists.`, "warn");
    this.render();
  }

  hotKey() {
    this.hot = true;
    log(this.logId, "One tenant/key = 70% of writes → shard 0 is the system. Split the key or isolate the tenant.", "err");
    this.render();
  }

  reshard() {
    const total = this.counts.reduce((a, b) => a + b, 0);
    this.counts = this.counts.map(() => Math.floor(total / this.n));
    this.hot = false;
    log(this.logId, "Reshard complete (simulated). Real reshard: dual-write, backfill, cutover, then delete leftovers.", "ok");
    this.render();
  }

  render() {
    setStat("shard-n", this.n);
    const max = Math.max(1, ...this.counts);
    const hotIdx = this.counts.indexOf(Math.max(...this.counts));
    setStat("shard-hot", this.hot ? `S${hotIdx}` : "—");
    setStat("shard-w", this.writes);
    const sized = sizeCanvas(this.canvas, 240);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const bw = (W - 20) / this.n;
    this.counts.forEach((c, i) => {
      const h = (c / max) * (H - 60);
      const x = 10 + i * bw + 8;
      ctx.fillStyle = this.hot && i === 0 ? "#c62828" : "#1565c0";
      ctx.fillRect(x, H - 28 - h, bw - 16, h);
      ctx.fillStyle = "#ddd";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`S${i}`, x + (bw - 16) / 2, H - 12);
      ctx.fillText(fmt(c), x + (bw - 16) / 2, H - 34 - h);
    });
  }
}

// ── Load balancer ─────────────────────────────────────────────
class LoadBalancerSim {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.reset();
  }

  reset() {
    this.stop();
    this.algo = (document.getElementById("lb-algo") || {}).value || "rr";
    this.nodes = [
      { name: "N0", alive: true, w: 3, conn: 0, hits: 0 },
      { name: "N1", alive: true, w: 2, conn: 0, hits: 0 },
      { name: "N2", alive: true, w: 1, conn: 0, hits: 0 },
    ];
    this.rr = 0;
    this.routed = 0;
    this.last = -1;
    log(this.logId, "3 backends, health checks every tick. Kill one: in-flight drain, new requests skip it. Sticky sessions would still pin to the corpse until the cookie expires.", "info");
    this.render();
  }

  setAlgo(a) { this.algo = a; setStat("lb-algo-stat", a); log(this.logId, `Algorithm: ${a}`, "info"); }

  run() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => {
      this.nodes.forEach(n => { if (n.alive && n.conn > 0 && Math.random() < 0.4) n.conn--; });
      const idx = this._pick();
      this.last = idx;
      if (idx >= 0) {
        this.nodes[idx].conn++;
        this.nodes[idx].hits++;
        this.routed++;
      } else {
        log(this.logId, "No healthy backends — 502", "err");
      }
      this.render();
    }, 180);
  }

  pause() { this.stop(); }
  stop() { this.running = false; clearInterval(this.interval); }

  addNode() {
    const i = this.nodes.length;
    this.nodes.push({ name: `N${i}`, alive: true, w: 1, conn: 0, hits: 0 });
    log(this.logId, `Added N${i}. Consistent-hash moves only a slice; RR immediately shares.`, "ok");
    this.render();
  }

  removeNode() {
    if (this.nodes.length <= 1) return;
    const n = this.nodes.pop();
    log(this.logId, `Removed ${n.name} — ${n.conn} in-flight must drain or reset`, "warn");
    this.render();
  }

  killNode(i) {
    if (!this.nodes[i]) return;
    this.nodes[i].alive = false;
    log(this.logId, `${this.nodes[i].name} failed health check. How does the LB know? Failed TCP / 5xx / timeout / active probe — not telepathy. In-flight requests error unless retried idempotently.`, "err");
    this.render();
  }

  _alive() { return this.nodes.map((n, i) => n.alive ? i : -1).filter(i => i >= 0); }

  _pick() {
    const a = this._alive();
    if (!a.length) return -1;
    if (this.algo === "lc") return a.reduce((best, i) => this.nodes[i].conn < this.nodes[best].conn ? i : best);
    if (this.algo === "wrr") {
      const bag = [];
      a.forEach(i => { for (let k = 0; k < this.nodes[i].w; k++) bag.push(i); });
      return bag[this.rr++ % bag.length];
    }
    if (this.algo === "ch") {
      const key = rand(0, 9999);
      return a[key % a.length];
    }
    return a[this.rr++ % a.length];
  }

  render() {
    setStat("lb-algo-stat", this.algo);
    setStat("lb-nodes", this._alive().length + "/" + this.nodes.length);
    setStat("lb-routed", this.routed);
    const sized = sizeCanvas(this.canvas, 260);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    ctx.fillStyle = "#90caf9";
    ctx.font = "13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LB", W / 2, 28);
    roundRect(ctx, W / 2 - 40, 36, 80, 28, 6);
    ctx.strokeStyle = "#7e57c2";
    ctx.stroke();
    ctx.fillStyle = "#ce93d8";
    ctx.fillText(this.algo, W / 2, 54);
    const n = this.nodes.length;
    this.nodes.forEach((node, i) => {
      const x = ((i + 0.5) / n) * W;
      const y = 170;
      ctx.strokeStyle = i === this.last ? "#ffe082" : "#445";
      ctx.beginPath();
      ctx.moveTo(W / 2, 64);
      ctx.lineTo(x, y - 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fillStyle = node.alive ? "#1565c0" : "#4e1414";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(node.name, x, y + 1);
      ctx.fillStyle = "#9e9ec8";
      ctx.font = "11px monospace";
      ctx.fillText(`conn ${node.conn}  hits ${node.hits}`, x, y + 40);
      ctx.font = "13px monospace";
    });
  }
}

// ── Retry storm ───────────────────────────────────────────────
class RetryStormSim {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.reset();
  }

  reset() {
    this.stop();
    this.inRps = 1000;
    this.retries = 3;
    this.fail = 0;
    this.hist = [];
    setStat("retry-in", this.inRps);
    setStat("retry-out", this.inRps);
    setStat("retry-amp", "1.0×");
    log(this.logId, "Healthy: 1000 rps in = 1000 rps down. Slow the dependency — retries multiply the outage.", "info");
    this.render(1000);
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => {
      const attemptFactor = 1 + this.fail * this.retries;
      const down = Math.round(this.inRps * attemptFactor);
      this.hist.push(down);
      if (this.hist.length > 40) this.hist.shift();
      setStat("retry-in", this.inRps);
      setStat("retry-out", down);
      setStat("retry-amp", attemptFactor.toFixed(1) + "×");
      if (this.fail > 0.4 && this.hist.length % 6 === 0) {
        log(this.logId, `${this.inRps} rps × (1+${this.retries} retries × ${Math.round(this.fail * 100)}% fail) ≈ ${down} downstream — you DDoS yourself`, "err");
      }
      this.render(down);
    }, 300);
  }

  pause() { this.stop(); }
  stop() { this.running = false; clearInterval(this.interval); }

  slowDownstream() {
    this.fail = 0.7;
    log(this.logId, "Downstream at 70% error. Each client retries 3× with no jitter → synchronized storm.", "err");
  }

  render(down) {
    const sized = sizeCanvas(this.canvas, 220);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const max = Math.max(this.inRps * (1 + this.retries), ...this.hist, 1);
    ctx.strokeStyle = "#42a5f5";
    ctx.beginPath();
    this.hist.forEach((v, i) => {
      const x = (i / 40) * (W - 20) + 10;
      const y = H - 20 - (v / max) * (H - 40);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = "#9e9ec8";
    ctx.font = "12px monospace";
    ctx.fillText(`downstream ${fmt(down)} rps`, 12, 20);
  }
}

// ── Circuit breaker ───────────────────────────────────────────
class CircuitBreakerSim {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.reset();
  }

  reset() {
    this.stop();
    this.state = "CLOSED";
    this.failRate = 0;
    this.fails = 0;
    this.rej = 0;
    this.ok = 0;
    this.halfProbe = 0;
    this.hist = [];
    setStat("cb-state", this.state);
    setStat("cb-fail", 0);
    setStat("cb-rej", 0);
    log(this.logId, "CLOSED: traffic flows. Trip after a burst of failures → OPEN (fail fast) → HALF-OPEN probe.", "info");
    this.render();
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => this._tick(), 200);
  }

  pause() { this.stop(); }
  stop() { this.running = false; clearInterval(this.interval); }

  injectFailure(p) {
    this.failRate = p;
    log(this.logId, p ? `Dependency error rate ${Math.round(p * 100)}%` : "Dependency healthy again", p ? "warn" : "ok");
  }

  _tick() {
    if (this.state === "OPEN") {
      this.rej++;
      this.hist.push(0);
      this.halfProbe++;
      if (this.halfProbe > 12) {
        this.state = "HALF-OPEN";
        this.halfProbe = 0;
        log(this.logId, "HALF-OPEN: one trial request", "warn");
      }
    } else {
      const fail = Math.random() < this.failRate;
      if (this.state === "HALF-OPEN") {
        if (fail) {
          this.fails++;
          this.state = "OPEN";
          this.halfProbe = 0;
          log(this.logId, "Probe failed — back to OPEN", "err");
        } else {
          this.ok++;
          this.fails = 0;
          this.state = "CLOSED";
          log(this.logId, "Probe succeeded — CLOSED", "ok");
        }
      } else if (fail) {
        this.fails++;
        if (this.fails >= 8) {
          this.state = "OPEN";
          this.halfProbe = 0;
          log(this.logId, "Threshold hit — OPEN. Fail fast so the dependency can recover (and so you stop retry-storming).", "err");
        }
      } else {
        this.ok++;
        this.fails = Math.max(0, this.fails - 1);
      }
      this.hist.push(fail ? 0 : 1);
    }
    if (this.hist.length > 50) this.hist.shift();
    setStat("cb-state", this.state);
    setStat("cb-fail", this.fails);
    setStat("cb-rej", this.rej);
    this.render();
  }

  render() {
    const sized = sizeCanvas(this.canvas, 220);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const color = { CLOSED: "#66bb6a", OPEN: "#ef5350", "HALF-OPEN": "#ffca28" }[this.state];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(70, H / 2, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(this.state, 70, H / 2 + 3);
    this.hist.forEach((ok, i) => {
      ctx.fillStyle = ok ? "#2e7d32" : "#c62828";
      ctx.fillRect(130 + i * 8, H / 2 - 20, 6, 40);
    });
  }
}

// ── Raft ──────────────────────────────────────────────────────
class RaftSim {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.reset();
  }

  reset() {
    this.stop();
    this.term = 0;
    this.commit = 0;
    this.tickN = 0;
    this.partitioned = new Set();
    this.nodes = [0, 1, 2, 3, 4].map(i => ({
      id: i, role: "follower", term: 0, votes: 0, timeout: rand(8, 16), alive: true, log: 0,
    }));
    log(this.logId, "5-node cluster, no leader yet. Timeouts fire independently — first candidate to a majority wins.", "info");
    this.render();
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => this.step(), 350);
  }

  pause() { this.stop(); log(this.logId, "Paused", "warn"); }
  stop() { this.running = false; clearInterval(this.interval); }

  step() {
    this.tickN++;
    const leader = this.nodes.find(n => n.role === "leader" && n.alive && !this.partitioned.has(n.id));
    this.nodes.forEach(n => {
      if (!n.alive) return;
      if (this.partitioned.has(n.id) && n.role === "leader") {
        n.role = "follower";
        log(this.logId, `N${n.id} partitioned — cannot reach majority, steps down`, "warn");
      }
      if (leader && !this.partitioned.has(n.id) && n.role !== "leader") {
        n.timeout = rand(8, 16);
        n.role = "follower";
        n.term = Math.max(n.term, leader.term);
        if (leader.log > n.log) n.log = leader.log;
      } else if (!leader) {
        n.timeout--;
        if (n.timeout <= 0 && n.role !== "candidate") this._elect(n);
      }
    });
    if (leader) {
      leader.log++;
      if (this.tickN % 3 === 0) {
        this.commit = leader.log;
        this.nodes.forEach(n => { if (n.alive && !this.partitioned.has(n.id)) n.log = leader.log; });
      }
    }
    this.render();
  }

  _elect(n) {
    if (this.partitioned.has(n.id)) { n.timeout = rand(8, 16); return; }
    n.role = "candidate";
    n.term++;
    this.term = Math.max(this.term, n.term);
    let votes = 1;
    this.nodes.forEach(o => {
      if (o.id !== n.id && o.alive && !this.partitioned.has(o.id) && o.term <= n.term) {
        votes++;
        o.term = n.term;
      }
    });
    if (votes >= 3) {
      n.role = "leader";
      log(this.logId, `N${n.id} won term ${n.term} with ${votes}/5 votes`, "ok");
    } else {
      n.role = "follower";
      n.timeout = rand(6, 14);
      log(this.logId, `N${n.id} lost term ${n.term} (${votes} votes) — split vote, retry`, "warn");
    }
  }

  killLeader() {
    const L = this.nodes.find(n => n.role === "leader");
    if (!L) { log(this.logId, "No leader to kill", "info"); return; }
    L.alive = false;
    L.role = "follower";
    log(this.logId, `Leader N${L.id} killed. Followers' election timeouts will fire. Uncommitted tail of the log may be overwritten.`, "err");
    this.render();
  }

  partition(id) {
    this.partitioned.add(id);
    log(this.logId, `N${id} partitioned — it may start an election it cannot win if it lacks a majority`, "err");
    this.render();
  }

  heal() {
    this.partitioned.clear();
    this.nodes.forEach(n => { if (!n.alive) { n.alive = true; n.timeout = rand(8, 16); } });
    log(this.logId, "Network healed, dead nodes recovered. Old leader must not accept writes without a current term.", "ok");
    this.render();
  }

  render() {
    const L = this.nodes.find(n => n.role === "leader" && n.alive);
    setStat("raft-term", this.term);
    setStat("raft-leader", L ? `N${L.id}` : "—");
    setStat("raft-commit", this.commit);
    const sized = sizeCanvas(this.canvas, 280);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.32;
    this.nodes.forEach((n, i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fillStyle = !n.alive ? "#333" : this.partitioned.has(n.id) ? "#6d4c41"
        : n.role === "leader" ? "#2e7d32" : n.role === "candidate" ? "#ef6c00" : "#1565c0";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`N${n.id}`, x, y - 2);
      ctx.font = "9px monospace";
      ctx.fillText(n.role[0].toUpperCase() + " t" + n.term, x, y + 11);
    });
  }
}

// ── Saga ──────────────────────────────────────────────────────
class SagaSim {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.steps = ["order", "reserve", "charge", "ship"];
    this.reset();
  }

  reset() {
    this.stop();
    this.i = -1;
    this.mode = "forward";
    this.status = this.steps.map(() => "pending");
    this.failStep = null;
    log(this.logId, "Order → reserve inventory → charge card → ship. Fail ship after payment to see compensations unwind.", "info");
    this.render();
  }

  failAt(name) { this.failStep = name; log(this.logId, `Will fail at ${name}`, "warn"); }

  run() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => this.step(), 700);
  }

  pause() { this.stop(); }
  stop() { this.running = false; clearInterval(this.interval); }

  step() {
    if (this.mode === "forward") {
      this.i++;
      if (this.i >= this.steps.length) {
        this.stop();
        log(this.logId, "Order complete — each step was a local transaction, not 2PC", "ok");
        return;
      }
      const s = this.steps[this.i];
      if (this.failStep === s) {
        this.status[this.i] = "failed";
        this.mode = "compensate";
        log(this.logId, `${s} failed after prior steps committed — compensating`, "err");
      } else {
        this.status[this.i] = "done";
        log(this.logId, `${s} committed locally`, "ok");
      }
    } else {
      this.i--;
      if (this.i < 0) {
        this.stop();
        log(this.logId, "Compensations done. Money/stock restored. Saga ≠ automatic rollback — you write the undo.", "warn");
        return;
      }
      if (this.status[this.i] === "done") {
        this.status[this.i] = "undone";
        log(this.logId, `Compensate ${this.steps[this.i]}`, "warn");
      }
    }
    this.render();
  }

  render() {
    const sized = sizeCanvas(this.canvas, 220);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const colors = { pending: "#37474f", done: "#2e7d32", failed: "#c62828", undone: "#ef6c00" };
    this.steps.forEach((s, i) => {
      const x = ((i + 0.5) / this.steps.length) * W;
      ctx.beginPath();
      ctx.arc(x, H / 2, 28, 0, Math.PI * 2);
      ctx.fillStyle = colors[this.status[i]];
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(s, x, H / 2 + 3);
      if (i < this.steps.length - 1) {
        ctx.strokeStyle = "#667";
        ctx.beginPath();
        ctx.moveTo(x + 30, H / 2);
        ctx.lineTo(x + W / this.steps.length - 30, H / 2);
        ctx.stroke();
      }
    });
  }
}

// ── Tail latency ──────────────────────────────────────────────
class TailLatencySim {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.reset();
  }

  reset() {
    this.stop();
    this.samples = [];
    this.hol = false;
    this.slowDep = false;
    log(this.logId, "Healthy service. Average will look fine while p99 tells the truth.", "info");
    this._stats();
    this.render();
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => {
      for (let i = 0; i < 20; i++) {
        let ms = 40 + rand(0, 50);
        if (this.hol && Math.random() < 0.08) ms += 800;
        if (this.slowDep && Math.random() < 0.01) ms += 4000;
        this.samples.push(ms);
      }
      if (this.samples.length > 400) this.samples.splice(0, this.samples.length - 400);
      this._stats();
      this.render();
    }, 250);
  }

  pause() { this.stop(); }
  stop() { this.running = false; clearInterval(this.interval); }

  injectHol() {
    this.hol = true;
    log(this.logId, "Head-of-line: a few fat requests block a shared connection/thread — p99 explodes, p50 barely moves", "err");
  }

  injectSlowDep() {
    this.slowDep = true;
    log(this.logId, "1% of calls hit a 4s dependency (or lock, or GC). One slow hop dominates p99.", "err");
  }

  _pct(p) {
    if (!this.samples.length) return 0;
    const s = [...this.samples].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  }

  _stats() {
    const avg = this.samples.length ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length : 0;
    setStat("tail-p50", this.samples.length ? Math.round(this._pct(0.5)) + "ms" : "—");
    setStat("tail-p95", this.samples.length ? Math.round(this._pct(0.95)) + "ms" : "—");
    setStat("tail-p99", this.samples.length ? Math.round(this._pct(0.99)) + "ms" : "—");
    setStat("tail-avg", this.samples.length ? Math.round(avg) + "ms" : "—");
  }

  render() {
    const sized = sizeCanvas(this.canvas, 240);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const buckets = Array(24).fill(0);
    this.samples.forEach(ms => {
      const b = clamp(Math.floor(ms / 200), 0, 23);
      buckets[b]++;
    });
    const max = Math.max(1, ...buckets);
    buckets.forEach((c, i) => {
      const h = (c / max) * (H - 40);
      ctx.fillStyle = i < 2 ? "#1565c0" : i < 6 ? "#ef6c00" : "#c62828";
      ctx.fillRect(10 + i * ((W - 20) / 24), H - 18 - h, (W - 20) / 24 - 2, h);
    });
    ctx.fillStyle = "#9e9ec8";
    ctx.font = "10px monospace";
    ctx.fillText("0ms", 10, H - 4);
    ctx.fillText("slow →", W - 50, H - 4);
  }
}

// ── DNS ───────────────────────────────────────────────────────
class DnsSim {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.nodes = ["Stub", "Resolver", "Root", "TLD", "Auth"];
    this.reset();
  }

  reset() {
    this.stop();
    this.i = 0;
    this.failed = false;
    this.done = false;
    log(this.logId, "Browser stub → recursive resolver → root → TLD → authoritative. Cache any of these and you skip the hop.", "info");
    this.render();
  }

  failNs() {
    this.failed = true;
    log(this.logId, "Authoritative NS timeout. Resolver tries the next NS; if all fail, the user sees a DNS error — never reached your LB.", "err");
    this.render();
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => this.step(), 600);
  }

  pause() { this.stop(); }
  stop() { this.running = false; clearInterval(this.interval); }

  step() {
    if (this.done) return;
    if (this.i === 4 && this.failed) {
      log(this.logId, "Auth NS failed — SERVFAIL after retries", "err");
      this.stop();
      this.render();
      return;
    }
    const msgs = [
      "Stub asks configured resolver (often 1.1.1.1 / 8.8.8.8 / corp DNS)",
      "Cache miss — resolver asks a root hint",
      "Root: 'com? ask the TLD NS'",
      "TLD: 'example.com? ask the authoritative NS'",
      "Auth returns A/AAAA. Resolver caches with TTL.",
    ];
    log(this.logId, msgs[this.i], "ok");
    this.i++;
    if (this.i >= this.nodes.length) {
      this.done = true;
      this.stop();
      log(this.logId, "Resolved. Next: TCP (+TLS) to that IP. Bad TTL or a stale cache is a production incident class of its own.", "info");
    }
    this.render();
  }

  render() {
    const sized = sizeCanvas(this.canvas, 240);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    this.nodes.forEach((name, i) => {
      const x = ((i + 0.5) / this.nodes.length) * W;
      ctx.beginPath();
      ctx.arc(x, H / 2, 24, 0, Math.PI * 2);
      ctx.fillStyle = i < this.i ? "#2e7d32" : i === this.i && this.failed && i === 4 ? "#c62828" : "#37474f";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(name, x, H / 2 + 3);
    });
  }
}

// ── TCP ───────────────────────────────────────────────────────
class TcpSim {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.reset();
  }

  reset() {
    this.stop();
    this.phase = 0;
    this.dropped = false;
    this.timedOut = false;
    this.labels = ["CLOSED", "SYN", "SYN-ACK", "ACK / ESTAB", "DATA", "FIN"];
    log(this.logId, "Three-way handshake before a single HTTP byte. A dropped SYN looks like 'the API is down'.", "info");
    this.render();
  }

  drop() {
    this.dropped = true;
    log(this.logId, "Packet dropped. Retransmit timer starts (often 200ms–1s). User-facing p99 just ate that wait.", "err");
  }

  timeout() {
    this.timedOut = true;
    this.stop();
    log(this.logId, "Connect timeout. Caller may retry — if the first SYN later succeeds you just double-submitted.", "err");
    this.render();
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => this.step(), 700);
  }

  pause() { this.stop(); }
  stop() { this.running = false; clearInterval(this.interval); }

  step() {
    if (this.timedOut) return;
    if (this.dropped && this.phase === 1) {
      log(this.logId, "Retransmitting SYN…", "warn");
      this.dropped = false;
      this.render();
      return;
    }
    if (this.phase < this.labels.length - 1) {
      this.phase++;
      log(this.logId, this.labels[this.phase], "ok");
    } else {
      this.stop();
      log(this.logId, "Connection closed. Pooling exists because this dance is expensive at 10k QPS.", "info");
    }
    this.render();
  }

  render() {
    const sized = sizeCanvas(this.canvas, 240);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    ctx.fillStyle = "#90caf9";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Client", 70, 28);
    ctx.fillText("Server", W - 70, 28);
    const y = 50 + this.phase * 28;
    ctx.strokeStyle = this.timedOut ? "#c62828" : "#66bb6a";
    ctx.beginPath();
    ctx.moveTo(90, y);
    ctx.lineTo(W - 90, y + (this.phase % 2 ? 12 : -12));
    ctx.stroke();
    ctx.fillStyle = "#ffe082";
    ctx.fillText(this.labels[this.phase] + (this.timedOut ? " TIMEOUT" : ""), W / 2, y - 8);
  }
}

// ── Kubernetes request flow ───────────────────────────────────
class K8sSim {
  constructor(canvasId, logId) {
    this.canvas = document.getElementById(canvasId);
    this.logId = logId;
    this.reset();
  }

  reset() {
    this.stop();
    this.hop = 0;
    this.hops = ["Client", "Ingress", "Service", "Endpoints", "Pod"];
    this.mode = "ok";
    this.result = "—";
    setStat("k8s-path", "idle");
    setStat("k8s-result", "—");
    log(this.logId, "Happy path: Client → Ingress → Service (ClusterIP) → Endpoints → Pod. Break endpoints or readiness to see 'pods look fine' outages.", "info");
    this.render();
  }

  heal() { this.mode = "ok"; log(this.logId, "Cluster healed", "ok"); this.render(); }
  failEndpoints() { this.mode = "no-ep"; log(this.logId, "Service has 0 endpoints — selector matches nothing or all pods unready", "err"); }
  failReadiness() { this.mode = "unready"; log(this.logId, "Readiness probe failing — pod Running, but removed from endpoints", "err"); }
  crashLoop() { this.mode = "crash"; log(this.logId, "CrashLoopBackOff — kubelet restarts, backoff grows, Service may have no ready pod", "err"); }

  run() {
    this.hop = 0;
    this.result = "…";
    this.running = true;
    clearInterval(this.interval);
    this.interval = setInterval(() => {
      this.hop++;
      if (this.hop === 3 && this.mode === "no-ep") {
        this.result = "503 no endpoints";
        setStat("k8s-path", "Service");
        setStat("k8s-result", this.result);
        log(this.logId, "kubectl get endpoints — empty. Pods can be Running. Ready≠Routable.", "err");
        this.stop();
      } else if (this.hop === 4 && (this.mode === "unready" || this.mode === "crash")) {
        this.result = this.mode === "crash" ? "no ready pod / CrashLoop" : "removed from EP (unready)";
        setStat("k8s-path", this.hops[this.hop]);
        setStat("k8s-result", this.result);
        log(this.logId, this.result, "err");
        this.stop();
      } else if (this.hop >= this.hops.length - 1) {
        this.result = "200 from Pod";
        setStat("k8s-path", "Pod");
        setStat("k8s-result", this.result);
        log(this.logId, "Served. Now check: which replica? connection reuse? next probe?", "ok");
        this.stop();
      } else {
        setStat("k8s-path", this.hops[this.hop]);
        log(this.logId, `Hop: ${this.hops[this.hop]}`, "info");
      }
      this.render();
    }, 500);
  }

  stop() { this.running = false; clearInterval(this.interval); }

  render() {
    const sized = sizeCanvas(this.canvas, 280);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    this.hops.forEach((name, i) => {
      const x = ((i + 0.5) / this.hops.length) * W;
      ctx.beginPath();
      ctx.arc(x, H / 2, 26, 0, Math.PI * 2);
      const bad = (this.mode !== "ok" && i >= 3);
      ctx.fillStyle = i < this.hop ? (bad && i === this.hop ? "#c62828" : "#2e7d32") : i === this.hop ? "#ef6c00" : "#37474f";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(name, x, H / 2 + 3);
    });
  }
}

// ── Capacity calculator ───────────────────────────────────────
class FrameworkWalkthrough {
  constructor() {
    this.i = 0;
    this.steps = [
      { s: "problem", boxes: 1, t: "1. Understand the problem",
        b: "Job: a user wants to know something happened. Not \"run Kafka.\" Ask what event, who receives, what happens if they never see it." },
      { s: "questions", boxes: 1, t: "2. Clarifying questions",
        b: "Channels? Chat vs like SLA? Prefs/mute? Marketing in scope? Offline 3 days? Each yes adds an entity or an SLO." },
      { s: "functional", boxes: 1, t: "3. Functional requirements",
        b: "IN: enqueue, prefs, at-least-once push, inbox. OUT of v1: SMS two-way, read receipts, campaigns." },
      { s: "nfr", boxes: 1, t: "4. Non-functional requirements",
        b: "Chat p99 < 2s. Like p99 < 30s. Enqueue 99.9%. No silent drop of transactional. Two SLAs ⇒ two queues later." },
      { s: "scale", boxes: 1, t: "5. Scale estimation",
        b: "50M DAU × 20/day = 1B/day ≈ 11.6k QPS avg, ~116k peak. 15 TB inbox/30d × RF=3 ≈ 45 TB. A pending table is already dead." },
      { s: "api", boxes: 2, t: "6. APIs",
        b: "POST /v1/events (idempotent event_id). GET /inbox?cursor. PUT /prefs. POST /devices. Contract before boxes." },
      { s: "model", boxes: 2, t: "7. Data model",
        b: "events PK, inbox(user_id,ts), prefs, devices, delivery_attempts(event_id,device) unique. Source of truth = event log." },
      { s: "v1", boxes: 3, t: "8. Simplest architecture",
        b: "Write API + Postgres + one worker pool → FCM/APNs. Legal. Draw this before Kafka so you know why you add it." },
      { s: "bottleneck", boxes: 3, t: "9. Bottlenecks",
        b: "116k inserts/s, APNs 800ms p99 holding threads, celebrity 10M-row txn, hot inbox range. Name deaths, do not decorate." },
      { s: "scale-out", boxes: 6, t: "10. Scale each bottleneck",
        b: "Kafka ingest. Workers per channel. Shard inbox by user_id. Fan-out-on-read for celebrities. Cache devices. One lever each." },
      { s: "failure", boxes: 7, t: "11. Failure analysis",
        b: "Worker crash → idempotent send. Poison → DLQ. APNs 12min 503 → isolate that channel. AZ loss → multi-AZ log." },
      { s: "consistency", boxes: 7, t: "12. Consistency",
        b: "Inbox replica lag 4s OK for likes. Chat badge: read-your-write (sticky to primary). Prefs: lose a mute = pager, not tweet." },
      { s: "reliability", boxes: 8, t: "13. Reliability",
        b: "Timeouts < SLO. Retry only with provider key. Breaker on APNs. Bulkhead pools. SMS has a budget breaker — $75k/day at 1%." },
      { s: "o11y", boxes: 8, t: "14. Observability",
        b: "Enqueue QPS, send QPS, depth, lag, channel p99, retry_ratio, pool util, GC, lock wait. \"Late\" is not a metric." },
      { s: "security", boxes: 8, t: "15. Security",
        b: "Device tokens are credentials. Prefs are PII. SMS is an abuse cannon. Rate-limit per user and per destination." },
      { s: "dr", boxes: 9, t: "16. Disaster recovery",
        b: "RPO 0 enqueue (multi-AZ Kafka). RTO 15m send. Inbox rebuildable from events. Test the rebuild, not the slide." },
      { s: "cost", boxes: 9, t: "17. Cost",
        b: "Push ≈ $0. SMS $0.0075. 1% of 1B = $75k/day. Cost is an SLI. Channel policy is cheaper than another region." },
      { s: "tradeoffs", boxes: 9, t: "18. Trade-offs",
        b: "Sync push: best p50, coupled to FCM. Queue: +tens of ms, enqueue survives FCM. Log+merge: celebrity-safe, more code." },
      { s: "evolve", boxes: 9, t: "19. Migration / evolution",
        b: "v1 Postgres. v2 Kafka when enqueue p99 > 200ms. v3 celebrity path at 100k fan-out. Dual-write, backfill, flip, delete. No flag day." },
    ];
    this.render(true);
  }

  next() { this.i = Math.min(this.steps.length - 1, this.i + 1); this.render(); }
  prev() { this.i = Math.max(0, this.i - 1); this.render(); }
  reset() { this.i = 0; this.render(true); log("fw-log", "Reset to step 1 — problem only", "info"); }

  render(silent) {
    const st = this.steps[this.i];
    const body = document.getElementById("fw-body");
    if (body) {
      const hint = st.boxes === 1 ? "no infra fashion yet"
        : st.boxes === 3 ? "API + DB + workers"
        : st.boxes < 7 ? "queue + split pools appear"
        : "breakers, rebuild path, budget fuse";
      body.innerHTML = `<div style="color:#90caf9;font-weight:700;margin-bottom:.4rem">${st.t}</div>
        <div>${st.b}</div>
        <div style="margin-top:.75rem;color:#ffe082">Design now: ${st.boxes} box${st.boxes === 1 ? "" : "es"} — ${hint}</div>`;
    }
    setStat("fw-step", `${this.i + 1}/19`);
    setStat("fw-surface", st.s);
    setStat("fw-boxes", st.boxes);
    if (!silent) log("fw-log", `${st.t} — boxes=${st.boxes}`, this.i >= 10 ? "warn" : "info");
  }
}

class CapacityCalc {
  compute() {
    const num = id => parseFloat((document.getElementById(id) || {}).value) || 0;
    const dau = num("cap-dau");
    const rpd = num("cap-rpd");
    const peak = num("cap-peak") || 1;
    const readPct = num("cap-readpct") / 100;
    const payload = num("cap-payload");
    const regions = Math.max(1, num("cap-regions") || 1);
    const rf = Math.max(1, num("cap-rf") || 1);
    const hit = num("cap-hit") / 100;
    const day = dau * rpd;
    const avgQps = day / 86400;
    const peakQps = avgQps * peak;
    const readQps = peakQps * readPct;
    const writeQps = peakQps * (1 - readPct);
    const missQps = readQps * (1 - hit);
    const bw = peakQps * payload; // B/s
    const storageDay = writeQps * 86400 * payload;
    const stored = storageDay * rf;
    const stats = document.getElementById("cap-stats");
    if (stats) {
      stats.innerHTML = [
        ["Req/day", fmt(day)],
        ["Avg QPS", fmt(avgQps)],
        ["Peak QPS", fmt(peakQps)],
        ["Peak writes", fmt(writeQps)],
        ["Cache misses", fmt(missQps)],
        ["Peak BW", fmt(bw) + " B/s"],
        ["Storage/day", fmt(storageDay) + " B"],
        ["With RF", fmt(stored) + " B"],
        ["Per region QPS", fmt(peakQps / regions)],
      ].map(([l, v]) => `<div class="sim-stat"><div class="sim-stat-label">${l}</div><div class="sim-stat-value">${v}</div></div>`).join("");
    }
    const flags = document.getElementById("cap-flags");
    const msgs = [];
    if (peakQps > 10000) msgs.push(["warn", "Peak > 10k QPS — a single-node primary will not casually absorb this. Partition writes or move them off the request path."]);
    if (missQps > 2000) msgs.push(["warn", "Cache miss QPS is a DB design constraint, not a cache footnote."]);
    if (stored > 1e12) msgs.push(["warn", "Replicated storage crosses ~1 TB/day-equivalent — lifecycle/tiering is now an architecture requirement."]);
    if (payload > 100000) msgs.push(["warn", "Large payloads: object store + CDN, not rows in the primary."]);
    if (!msgs.length) msgs.push(["ok", "These are Fermi estimates (±2×). Use them to pick the first bottleneck, not to buy hardware."]);
    if (flags) flags.innerHTML = msgs.map(([k, t]) => `<div class="cap-flag ${k}">${t}</div>`).join("");
    log("cap-log", `Peak ${fmt(peakQps)} QPS · miss ${fmt(missQps)} · day ${fmt(day)} req`, "ok");
  }

  reset() {
    const defaults = { "cap-dau": 1e7, "cap-rpd": 20, "cap-peak": 8, "cap-readpct": 90, "cap-payload": 2048, "cap-regions": 1, "cap-rf": 3, "cap-hit": 80 };
    Object.entries(defaults).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
    this.compute();
  }
}

// ── Little's Law / availability ───────────────────────────────
class MathCalc {
  compute() {
    const λ = parseFloat((document.getElementById("ll-lambda") || {}).value) || 0;
    const W = parseFloat((document.getElementById("ll-w") || {}).value) || 0;
    const nines = parseInt((document.getElementById("ll-nines") || {}).value, 10) || 0;
    const L = λ * W;
    const avail = 1 - Math.pow(10, -nines);
    const downSec = (1 - avail) * 30 * 24 * 3600;
    setStat("ll-l", L.toFixed(1) + " in-flight");
    let down;
    if (downSec >= 60) down = (downSec / 60).toFixed(1) + " min/mo";
    else down = downSec.toFixed(0) + " s/mo";
    setStat("ll-down", nines ? down : "—");
    log("ll-log", `L=λW → ${L.toFixed(1)} concurrent. ${nines} nines ≈ ${down}. 99.9%≈43.8m  99.99%≈4.4m  99.999%≈26s`, "ok");
  }
}

// ── DSA: Sliding Window ───────────────────────────────────────
class SlidingWindowViz {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.arr = [];
    this.left = 0; this.right = -1;
    this.target = null;
    this.running = false;
    this.delay = 500;
  }

  init(arr, target) {
    this.arr = arr;
    this.target = (target === undefined || target === null) ? null : target;
    this.left = 0; this.right = -1;
    this.running = false;
    this.render();
    if (this.target != null) this._log("Array ready. Target sum: " + this.target, "info");
    else this._log("Array ready. Fixed-window max sum (no target).", "info");
  }

  reset() { this.init(this.arr.length ? this.arr : [3, 1, 2, 5, 8, 2, 6, 1, 4, 9, 3], this.target); }

  pause() { this.running = false; }

  render(result = null) {
    const arrDiv = document.getElementById("sw-array");
    if (!arrDiv) return;
    arrDiv.innerHTML = "";
    this.arr.forEach((val, i) => {
      const cell = document.createElement("div");
      cell.className = "dsa-cell";
      if (i >= this.left && i <= this.right) cell.classList.add("window");
      if (i === this.left) cell.classList.add("active");
      if (i === this.right && i !== this.left) cell.classList.add("current");
      cell.textContent = val;
      arrDiv.appendChild(cell);
    });
    const info = document.getElementById("sw-info");
    if (info) {
      const windowSum = this.arr.slice(this.left, this.right + 1).reduce((a, b) => a + b, 0);
      const targetBit = this.target != null ? `  Target=${this.target}` : "";
      info.textContent = `Window [${this.left}..${this.right}]  Sum=${windowSum}` + targetBit +
        (result !== null ? `  ✓ Found: [${result}]` : "");
    }
  }

  _log(msg, type) { log("sw-log", msg, type); }

  async runMaxSumSubarray(k) {
    if (this.running) return;
    this.running = true;
    this.left = 0; this.right = -1;
    let maxSum = -Infinity, windowSum = 0, bestL = 0;
    this._log(`Max sum subarray of length ${k}`, "info");
    for (let i = 0; i < this.arr.length; i++) {
      if (!this.running) break;
      this.right = i;
      windowSum += this.arr[i];
      if (i >= k) { windowSum -= this.arr[this.left]; this.left++; }
      if (i >= k - 1) {
        if (windowSum > maxSum) { maxSum = windowSum; bestL = this.left; }
        this._log(`Window [${this.left}..${this.right}] sum=${windowSum} best=${maxSum}`, "info");
      }
      this.render();
      await sleep(this.delay);
    }
    this._log(`Max sum: ${maxSum} at [${bestL}..${bestL + k - 1}]`, "ok");
    this.running = false;
  }
}

// ── DSA: BFS/DFS ──────────────────────────────────────────────
class GraphViz {
  constructor(containerId, logId) {
    this.containerId = containerId;
    this.logId = logId;
    this.delay = 550;
    this.reset();
  }

  reset() {
    this.running = false;
    this.nodes = [
      { id: 0, label: "A", x: 50, y: 22, state: "unvisited" },
      { id: 1, label: "B", x: 25, y: 48, state: "unvisited" },
      { id: 2, label: "C", x: 75, y: 48, state: "unvisited" },
      { id: 3, label: "D", x: 12, y: 78, state: "unvisited" },
      { id: 4, label: "E", x: 38, y: 78, state: "unvisited" },
      { id: 5, label: "F", x: 62, y: 78, state: "unvisited" },
      { id: 6, label: "G", x: 88, y: 78, state: "unvisited" },
    ];
    this.edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
    this.render();
  }

  _adj(id) {
    return this.edges.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));
  }

  async bfs(startId = 0) {
    if (this.running) return;
    this.running = true;
    this.nodes.forEach(n => n.state = "unvisited");
    const visited = new Set([startId]);
    const queue = [startId];
    const order = [];
    this.nodes[startId].state = "queued";
    log(this.logId, `BFS from ${this.nodes[startId].label} — queue explores siblings first (shortest unweighted path)`, "info");
    this.render();
    await sleep(this.delay);
    while (queue.length && this.running) {
      const id = queue.shift();
      this.nodes[id].state = "current";
      order.push(this.nodes[id].label);
      log(this.logId, `Visit ${this.nodes[id].label} | ${order.join("→")}`, "ok");
      this.render();
      await sleep(this.delay);
      for (const nb of this._adj(id)) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
          this.nodes[nb].state = "queued";
          log(this.logId, `Enqueue ${this.nodes[nb].label}`, "info");
        }
      }
      this.nodes[id].state = "visited";
      this.render();
      await sleep(this.delay / 2);
    }
    log(this.logId, `BFS: ${order.join(" → ")}`, "ok");
    this.running = false;
  }

  async dfs(startId = 0) {
    if (this.running) return;
    this.running = true;
    this.nodes.forEach(n => n.state = "unvisited");
    const visited = new Set();
    const order = [];
    log(this.logId, `DFS from ${this.nodes[startId].label} — stack/recursion dives deep (cycle detection, topo, components)`, "info");
    const recurse = async (id, depth) => {
      if (!this.running) return;
      visited.add(id);
      this.nodes[id].state = "current";
      order.push(this.nodes[id].label);
      log(this.logId, `${"  ".repeat(depth)}Visit ${this.nodes[id].label}`, "ok");
      this.render();
      await sleep(this.delay);
      for (const nb of this._adj(id)) {
        if (!visited.has(nb)) await recurse(nb, depth + 1);
      }
      this.nodes[id].state = "visited";
      this.render();
    };
    await recurse(startId, 0);
    log(this.logId, `DFS: ${order.join(" → ")}`, "ok");
    this.running = false;
  }

  render() {
    const canvas = document.getElementById(this.containerId);
    const sized = sizeCanvas(canvas, 300);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const colors = { unvisited: "#37474f", queued: "#f57f17", visited: "#1565c0", current: "#b71c1c", path: "#1b5e20" };
    this.edges.forEach(([a, b]) => {
      const na = this.nodes[a], nb = this.nodes[b];
      ctx.beginPath();
      ctx.moveTo(na.x / 100 * W, na.y / 100 * H);
      ctx.lineTo(nb.x / 100 * W, nb.y / 100 * H);
      ctx.strokeStyle = "#445";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    this.nodes.forEach(node => {
      const x = node.x / 100 * W, y = node.y / 100 * H;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = colors[node.state];
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, x, y);
    });
  }
}

// ── DSA: DP coin change ───────────────────────────────────────
class DpViz {
  constructor() {
    this.coins = [1, 3, 4];
    this.amount = 6;
    this.reset();
  }

  reset() {
    this.running = false;
    this.dp = Array(this.amount + 1).fill(Infinity);
    this.dp[0] = 0;
    this.i = 1;
    this.render();
    log("dp-log", `dp[x] = min coins to make x. coins=${this.coins}. Recurrence: dp[x] = 1 + min(dp[x-c])`, "info");
  }

  pause() { this.running = false; }

  step() {
    if (this.i > this.amount) {
      log("dp-log", `Done. dp[${this.amount}]=${this.dp[this.amount]}`, "ok");
      return false;
    }
    let best = Infinity, used = null;
    for (const c of this.coins) {
      if (this.i - c >= 0 && this.dp[this.i - c] + 1 < best) {
        best = this.dp[this.i - c] + 1;
        used = c;
      }
    }
    this.dp[this.i] = best;
    log("dp-log", `dp[${this.i}] = ${best === Infinity ? "∞" : best}` + (used != null ? ` via coin ${used}` : ""), "ok");
    this.i++;
    this.render();
    return this.i <= this.amount;
  }

  async run() {
    if (this.running) return;
    this.running = true;
    while (this.running && this.step()) await sleep(500);
    this.running = false;
  }

  render() {
    const grid = document.getElementById("dp-grid");
    if (!grid) return;
    grid.innerHTML = "";
    this.dp.forEach((v, i) => {
      const cell = document.createElement("div");
      cell.className = "dsa-cell";
      if (i === this.i - 1) cell.classList.add("current");
      if (v !== Infinity && i < this.i) cell.classList.add("window");
      cell.textContent = v === Infinity ? "∞" : v;
      cell.title = `dp[${i}]`;
      grid.appendChild(cell);
    });
    const info = document.getElementById("dp-info");
    if (info) info.textContent = `amount index 0..${this.amount}  next=${this.i <= this.amount ? this.i : "done"}`;
  }
}

// ── DSA: Heap (min-heap insert / extract-min / heapify) ────────
class HeapViz {
  constructor(canvasId, logId) {
    this.canvasId = canvasId;
    this.logId = logId;
    this.delay = 500;
    this.reset();
  }

  reset() {
    this.running = false;
    this.heap = [];
    this.render();
    log(this.logId, "Empty min-heap. Insert values or heapify a random array.", "info");
  }

  async insert(val) {
    if (this.running) return;
    if (val === null || val === undefined || Number.isNaN(val)) val = rand(1, 99);
    this.running = true;
    this.heap.push(val);
    let i = this.heap.length - 1;
    log(this.logId, `Insert ${val} at index ${i} (append to end of array)`, "info");
    this.render(i);
    await sleep(this.delay);
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.heap[p] <= this.heap[i]) break;
      log(this.logId, `Sift up: ${this.heap[i]} < parent ${this.heap[p]} — swap idx ${i}↔${p}`, "warn");
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
      this.render(i);
      await sleep(this.delay);
    }
    log(this.logId, `${val} settled at index ${i}. Heap property restored.`, "ok");
    this.running = false;
  }

  async extractMin() {
    if (this.running || !this.heap.length) { log(this.logId, "Heap is empty", "warn"); return; }
    this.running = true;
    const min = this.heap[0];
    log(this.logId, `Extract-min: root = ${min}`, "info");
    const last = this.heap.pop();
    if (this.heap.length) {
      this.heap[0] = last;
      log(this.logId, `Move last element ${last} to root, sift down`, "info");
      this.render(0);
      await sleep(this.delay);
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let smallest = i;
        if (l < this.heap.length && this.heap[l] < this.heap[smallest]) smallest = l;
        if (r < this.heap.length && this.heap[r] < this.heap[smallest]) smallest = r;
        if (smallest === i) break;
        [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
        log(this.logId, `Sift down: swap idx ${i}↔${smallest}`, "warn");
        i = smallest;
        this.render(i);
        await sleep(this.delay);
      }
    }
    log(this.logId, `Extracted ${min}. Heap size now ${this.heap.length}.`, "ok");
    this.running = false;
  }

  async heapify() {
    if (this.running) return;
    this.running = true;
    this.heap = Array.from({ length: 7 }, () => rand(1, 99));
    log(this.logId, `Heapify random array: [${this.heap.join(", ")}]`, "info");
    this.render();
    await sleep(this.delay);
    const n = this.heap.length;
    for (let start = Math.floor(n / 2) - 1; start >= 0; start--) {
      let cur = start;
      while (true) {
        const l = 2 * cur + 1, r = 2 * cur + 2;
        let smallest = cur;
        if (l < n && this.heap[l] < this.heap[smallest]) smallest = l;
        if (r < n && this.heap[r] < this.heap[smallest]) smallest = r;
        if (smallest === cur) break;
        [this.heap[cur], this.heap[smallest]] = [this.heap[smallest], this.heap[cur]];
        this.render(smallest);
        await sleep(this.delay * 0.7);
        cur = smallest;
      }
    }
    log(this.logId, `Heapify done (bottom-up, O(n)): [${this.heap.join(", ")}]`, "ok");
    this.running = false;
  }

  render(highlight = -1) {
    setStat("heap-size", this.heap.length);
    setStat("heap-min", this.heap.length ? this.heap[0] : "—");
    const canvas = document.getElementById(this.canvasId);
    const sized = sizeCanvas(canvas, 280);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const n = this.heap.length;
    const positions = [];
    for (let i = 0; i < n; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const idxInLevel = i + 1 - Math.pow(2, level);
      const slots = Math.pow(2, level);
      positions.push({ x: (idxInLevel + 0.5) / slots * W, y: 26 + level * 42 });
    }
    ctx.strokeStyle = "#445";
    ctx.lineWidth = 2;
    for (let i = 1; i < n; i++) {
      const p = Math.floor((i - 1) / 2);
      ctx.beginPath();
      ctx.moveTo(positions[p].x, positions[p].y);
      ctx.lineTo(positions[i].x, positions[i].y);
      ctx.stroke();
    }
    this.heap.forEach((v, i) => {
      const { x, y } = positions[i];
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fillStyle = i === highlight ? "#b71c1c" : (i === 0 ? "#1565c0" : "#37474f");
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v, x, y);
    });
    const rowY = H - 22;
    const cw = Math.min(40, (W - 20) / Math.max(n, 1));
    this.heap.forEach((v, i) => {
      const x = 10 + i * cw;
      ctx.fillStyle = i === highlight ? "#b71c1c" : "#1e1e3a";
      ctx.fillRect(x, rowY - 14, cw - 4, 28);
      ctx.strokeStyle = "#3a3a6a";
      ctx.strokeRect(x, rowY - 14, cw - 4, 28);
      ctx.fillStyle = "#e0e0ff";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v, x + (cw - 4) / 2, rowY);
    });
  }
}

// ── DSA: Dijkstra shortest path ─────────────────────────────────
class DijkstraViz {
  constructor(canvasId, logId) {
    this.canvasId = canvasId;
    this.logId = logId;
    this.delay = 650;
    this.reset();
  }

  reset() {
    this.running = false;
    this.nodes = [
      { id: 0, label: "A", x: 8, y: 50 },
      { id: 1, label: "B", x: 32, y: 15 },
      { id: 2, label: "C", x: 32, y: 85 },
      { id: 3, label: "D", x: 60, y: 15 },
      { id: 4, label: "E", x: 60, y: 85 },
      { id: 5, label: "F", x: 90, y: 50 },
    ];
    this.edges = [[0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5], [2, 3, 8], [2, 4, 10], [3, 4, 2], [3, 5, 6], [4, 5, 3]];
    this.dist = Array(6).fill(Infinity);
    this.prev = Array(6).fill(null);
    this.state = Array(6).fill("unvisited");
    this.render();
    log(this.logId, "Weighted graph ready. Run Dijkstra from A.", "info");
  }

  _adj(id) {
    const out = [];
    this.edges.forEach(([a, b, w]) => {
      if (a === id) out.push([b, w]);
      if (b === id) out.push([a, w]);
    });
    return out;
  }

  async run(startId = 0) {
    if (this.running) return;
    this.running = true;
    this.dist = Array(6).fill(Infinity);
    this.prev = Array(6).fill(null);
    this.state = Array(6).fill("unvisited");
    this.dist[startId] = 0;
    this.state[startId] = "frontier";
    const visited = new Set();
    log(this.logId, `Start from ${this.nodes[startId].label}, dist=0. Always expand the closest unvisited node.`, "info");
    this.render();
    await sleep(this.delay);
    while (this.running) {
      let u = -1, best = Infinity;
      for (let i = 0; i < 6; i++) if (!visited.has(i) && this.dist[i] < best) { best = this.dist[i]; u = i; }
      if (u === -1) break;
      visited.add(u);
      this.state[u] = "current";
      log(this.logId, `Visit ${this.nodes[u].label} (dist=${this.dist[u]}) — settled, never revisited`, "ok");
      this.render();
      await sleep(this.delay);
      for (const [v, w] of this._adj(u)) {
        if (visited.has(v)) continue;
        const nd = this.dist[u] + w;
        if (nd < this.dist[v]) {
          this.dist[v] = nd;
          this.prev[v] = u;
          this.state[v] = "frontier";
          log(this.logId, `Relax ${this.nodes[u].label}→${this.nodes[v].label} (w=${w}): dist[${this.nodes[v].label}]=${nd}`, "info");
        }
      }
      this.state[u] = "done";
      this.render();
      await sleep(this.delay / 2);
    }
    log(this.logId, `Final distances: ${this.nodes.map((n, i) => `${n.label}=${this.dist[i] === Infinity ? "∞" : this.dist[i]}`).join(", ")}`, "ok");
    this.running = false;
  }

  render() {
    const canvas = document.getElementById(this.canvasId);
    const sized = sizeCanvas(canvas, 300);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const colors = { unvisited: "#37474f", frontier: "#f57f17", current: "#b71c1c", done: "#1565c0" };
    this.edges.forEach(([a, b, w]) => {
      const na = this.nodes[a], nb = this.nodes[b];
      const x1 = na.x / 100 * W, y1 = na.y / 100 * H, x2 = nb.x / 100 * W, y2 = nb.y / 100 * H;
      const onPath = this.prev[b] === a || this.prev[a] === b;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = onPath ? "#66bb6a" : "#445";
      ctx.lineWidth = onPath ? 3 : 2;
      ctx.stroke();
      ctx.fillStyle = "#9e9ec8";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(w, (x1 + x2) / 2, (y1 + y2) / 2 - 4);
    });
    this.nodes.forEach((n, i) => {
      const x = n.x / 100 * W, y = n.y / 100 * H;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = colors[this.state[i]];
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, x, y - 4);
      ctx.font = "9px monospace";
      ctx.fillText(this.dist[i] === Infinity ? "∞" : this.dist[i], x, y + 8);
    });
  }
}

// ── DSA: Union-Find (path compression + union by rank) ─────────
class UnionFindViz {
  constructor(canvasId, logId) {
    this.canvasId = canvasId;
    this.logId = logId;
    this.n = 10;
    this.reset();
  }

  reset() {
    this.running = false;
    this.parent = Array.from({ length: this.n }, (_, i) => i);
    this.rank = Array(this.n).fill(0);
    this.highlight = new Set();
    this.render();
    log(this.logId, `${this.n} singleton sets. Union by rank + path compression keeps trees nearly flat.`, "info");
  }

  async union(a, b) {
    if (this.running) return;
    this.running = true;
    log(this.logId, `Union(${a}, ${b})`, "info");
    const ra = await this._findAnimated(a);
    const rb = await this._findAnimated(b);
    if (ra === rb) {
      log(this.logId, `${a} and ${b} already share root ${ra} — no-op`, "warn");
    } else if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
      log(this.logId, `Attach root ${ra} under root ${rb} (rank ${this.rank[ra]} < ${this.rank[rb]})`, "ok");
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
      log(this.logId, `Attach root ${rb} under root ${ra} (rank ${this.rank[rb]} < ${this.rank[ra]})`, "ok");
    } else {
      this.parent[rb] = ra;
      this.rank[ra]++;
      log(this.logId, `Equal rank: attach ${rb} under ${ra}, bump rank to ${this.rank[ra]}`, "ok");
    }
    this.highlight = new Set();
    this.render();
    this.running = false;
  }

  async find(x) {
    if (this.running) return;
    this.running = true;
    await this._findAnimated(x);
    this.highlight = new Set();
    this.render();
    this.running = false;
  }

  async _findAnimated(x) {
    const path = [];
    let cur = x;
    while (this.parent[cur] !== cur) { path.push(cur); cur = this.parent[cur]; }
    path.push(cur);
    log(this.logId, `Find(${x}): path to root = ${path.join("→")}`, "info");
    this.highlight = new Set(path);
    this.render();
    await sleep(450);
    path.slice(0, -1).forEach(node => { this.parent[node] = cur; });
    if (path.length > 2) log(this.logId, `Path compression: nodes ${path.slice(0, -1).join(",")} now point directly to root ${cur}`, "ok");
    this.render();
    await sleep(350);
    return cur;
  }

  render() {
    const canvas = document.getElementById(this.canvasId);
    const sized = sizeCanvas(canvas, 260);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const cols = 5;
    const cellW = W / cols, cellH = (H - 40) / Math.ceil(this.n / cols);
    const pos = {};
    for (let i = 0; i < this.n; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      pos[i] = { x: cellW * (col + 0.5), y: 30 + row * cellH * 1.6 };
    }
    ctx.lineWidth = 2;
    for (let i = 0; i < this.n; i++) {
      if (this.parent[i] !== i) {
        ctx.beginPath();
        ctx.moveTo(pos[i].x, pos[i].y);
        ctx.lineTo(pos[this.parent[i]].x, pos[this.parent[i]].y);
        ctx.strokeStyle = (this.highlight.has(i) && this.highlight.has(this.parent[i])) ? "#f57f17" : "#456";
        ctx.stroke();
      }
    }
    for (let i = 0; i < this.n; i++) {
      const { x, y } = pos[i];
      const isRoot = this.parent[i] === i;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fillStyle = this.highlight.has(i) ? "#b71c1c" : (isRoot ? "#1565c0" : "#37474f");
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i, x, y);
    }
  }
}

// ── DSA: N-Queens backtracking ──────────────────────────────────
class NQueensViz {
  constructor(containerId, logId) {
    this.containerId = containerId;
    this.logId = logId;
    this.n = 8;
    this.delay = 110;
    this.reset();
  }

  reset() {
    this.running = false;
    this.stopFlag = false;
    this.cols = new Set(); this.diag1 = new Set(); this.diag2 = new Set();
    this.board = Array(this.n).fill(-1);
    this.solutions = 0;
    this.steps = 0;
    this.current = null;
    this.render();
    log(this.logId, `${this.n}-Queens: place one queen per row, backtrack on conflict.`, "info");
  }

  stop() { this.stopFlag = true; this.running = false; }

  async solve() {
    if (this.running) return;
    this.running = true; this.stopFlag = false;
    this.cols.clear(); this.diag1.clear(); this.diag2.clear();
    this.board = Array(this.n).fill(-1);
    this.solutions = 0; this.steps = 0;
    log(this.logId, "Backtracking search started — stops at first solution", "info");
    await this._place(0);
    this.running = false;
  }

  async _place(row) {
    if (this.stopFlag) return false;
    if (row === this.n) {
      this.solutions++;
      log(this.logId, `Solution found after ${this.steps} attempts`, "ok");
      this.render();
      return true;
    }
    for (let col = 0; col < this.n; col++) {
      if (this.stopFlag) return false;
      this.steps++;
      this.current = { row, col };
      const d1 = row - col, d2 = row + col;
      if (this.cols.has(col) || this.diag1.has(d1) || this.diag2.has(d2)) {
        this.render(false);
        await sleep(this.delay);
        continue;
      }
      this.board[row] = col;
      this.cols.add(col); this.diag1.add(d1); this.diag2.add(d2);
      this.render(true);
      await sleep(this.delay);
      if (await this._place(row + 1)) return true;
      this.board[row] = -1;
      this.cols.delete(col); this.diag1.delete(d1); this.diag2.delete(d2);
      log(this.logId, `Backtrack: row ${row} col ${col} led to a dead end`, "warn");
      this.render(false);
      await sleep(this.delay);
    }
    return false;
  }

  render(ok = null) {
    setStat("nq-steps", this.steps);
    setStat("nq-solutions", this.solutions);
    const grid = document.getElementById(this.containerId);
    if (!grid) return;
    grid.innerHTML = "";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${this.n}, 1fr)`;
    grid.style.gap = "2px";
    grid.style.maxWidth = "360px";
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const cell = document.createElement("div");
        cell.className = "dsa-cell";
        cell.style.width = "100%";
        cell.style.height = "40px";
        cell.style.fontSize = "1.1rem";
        if (this.current && this.current.row === r && this.current.col === c && this.board[r] !== c) {
          cell.classList.add(ok ? "active" : "current");
        }
        if (this.board[r] === c) { cell.textContent = "♛"; cell.classList.add("optimal"); }
        grid.appendChild(cell);
      }
    }
  }
}

// ── DSA: Sorting (quicksort / mergesort / heapsort) ─────────────
class SortViz {
  constructor(canvasId, logId) {
    this.canvasId = canvasId;
    this.logId = logId;
    this.delay = 55;
    this.reset();
  }

  reset() {
    this.running = false;
    this.arr = Array.from({ length: 20 }, () => rand(5, 100));
    this.compares = 0; this.swaps = 0;
    this.active = [];
    this.render();
    log(this.logId, `New random array of ${this.arr.length} elements.`, "info");
  }

  async quicksort() { await this._run(() => this._qs(0, this.arr.length - 1), "Quicksort"); }
  async mergesort() { await this._run(() => this._ms(0, this.arr.length - 1), "Merge sort"); }
  async heapsort() { await this._run(() => this._hs(), "Heap sort"); }
  async bucketSort() { await this._run(() => this._bs(), "Bucket sort"); }

  async _run(fn, name) {
    if (this.running) return;
    this.running = true;
    this.compares = 0; this.swaps = 0;
    log(this.logId, `${name} started on ${this.arr.length} elements`, "info");
    await fn();
    this.active = [];
    this.render();
    log(this.logId, `${name} done: ${this.compares} comparisons, ${this.swaps} swaps`, "ok");
    this.running = false;
  }

  async _swap(i, j) {
    [this.arr[i], this.arr[j]] = [this.arr[j], this.arr[i]];
    this.swaps++;
    this.active = [i, j];
    this.render();
    await sleep(this.delay);
  }

  async _compare(i, j) {
    this.compares++;
    this.active = [i, j];
    this.render();
    await sleep(this.delay);
  }

  async _qs(lo, hi) {
    if (lo >= hi) return;
    const pivot = this.arr[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      await this._compare(j, hi);
      if (this.arr[j] < pivot) { await this._swap(i, j); i++; }
    }
    await this._swap(i, hi);
    await this._qs(lo, i - 1);
    await this._qs(i + 1, hi);
  }

  async _ms(lo, hi) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    await this._ms(lo, mid);
    await this._ms(mid + 1, hi);
    const merged = [];
    let i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {
      await this._compare(i, j);
      if (this.arr[i] <= this.arr[j]) merged.push(this.arr[i++]);
      else merged.push(this.arr[j++]);
    }
    while (i <= mid) merged.push(this.arr[i++]);
    while (j <= hi) merged.push(this.arr[j++]);
    for (let k = 0; k < merged.length; k++) { this.arr[lo + k] = merged[k]; this.swaps++; }
    this.active = [lo, hi];
    this.render();
    await sleep(this.delay);
  }

  async _hs() {
    const n = this.arr.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) await this._siftDown(i, n);
    for (let end = n - 1; end > 0; end--) {
      await this._swap(0, end);
      await this._siftDown(0, end);
    }
  }

  async _siftDown(i, n) {
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let largest = i;
      if (l < n) { await this._compare(l, largest); if (this.arr[l] > this.arr[largest]) largest = l; }
      if (r < n) { await this._compare(r, largest); if (this.arr[r] > this.arr[largest]) largest = r; }
      if (largest === i) break;
      await this._swap(i, largest);
      i = largest;
    }
  }

  async _bs() {
    // Bucket sort: distribute into value-range buckets (animated), rebuild the
    // array grouped by bucket, then insertion-sort each bucket range in place
    // using the same _compare/_swap primitives the other algorithms use.
    const n = this.arr.length;
    const min = Math.min(...this.arr);
    const max = Math.max(...this.arr);
    const bucketCount = 5;
    const range = (max - min + 1) / bucketCount;
    const buckets = Array.from({ length: bucketCount }, () => []);

    for (let i = 0; i < n; i++) {
      const idx = Math.min(bucketCount - 1, Math.floor((this.arr[i] - min) / range));
      buckets[idx].push(this.arr[i]);
      this.active = [i];
      this.render();
      await sleep(this.delay);
    }

    let pos = 0;
    const boundaries = [];
    for (const b of buckets) {
      boundaries.push(pos);
      for (const v of b) { this.arr[pos] = v; pos++; }
    }
    this.active = [];
    this.render();
    await sleep(this.delay);

    for (let bi = 0; bi < bucketCount; bi++) {
      const start = boundaries[bi];
      const end = (bi + 1 < bucketCount ? boundaries[bi + 1] : n) - 1;
      for (let i = start + 1; i <= end; i++) {
        let j = i;
        while (j > start) {
          await this._compare(j - 1, j);
          if (this.arr[j - 1] > this.arr[j]) { await this._swap(j - 1, j); j--; }
          else break;
        }
      }
    }
  }

  render() {
    setStat("sort-compares", this.compares);
    setStat("sort-swaps", this.swaps);
    const canvas = document.getElementById(this.canvasId);
    const sized = sizeCanvas(canvas, 240);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const max = Math.max(...this.arr);
    const bw = W / this.arr.length;
    this.arr.forEach((v, i) => {
      const h = (v / max) * (H - 20);
      ctx.fillStyle = this.active.includes(i) ? "#b71c1c" : "#1565c0";
      ctx.fillRect(i * bw + 1, H - h, bw - 2, h);
    });
  }
}

// ── DSA: Bloom filter (probabilistic set membership) ────────────
class BloomFilterViz {
  constructor(containerId, logId) {
    this.containerId = containerId;
    this.logId = logId;
    this.m = 32;  // bit array size
    this.k = 3;   // number of hash functions
    this.delay = 260;
    this.reset();
  }

  reset() {
    this.running = false;
    this.bits = Array(this.m).fill(0);
    this.added = new Set();
    this.highlight = [];
    this.render();
    setStat("bloom-added", 0);
    setStat("bloom-fpr", "0.0%");
    log(this.logId, `Reset: m=${this.m} bits, k=${this.k} hash functions.`, "info");
  }

  _hash(str, seed) {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % this.m;
  }

  _positions(str) {
    const pos = [];
    for (let i = 0; i < this.k; i++) pos.push(this._hash(str, 17 + i * 101));
    return pos;
  }

  async add(word) {
    if (this.running || !word) return;
    this.running = true;
    word = word.toLowerCase().trim();
    const positions = this._positions(word);
    log(this.logId, `Add "${word}" → hash positions [${positions.join(", ")}]`, "info");
    for (const p of positions) {
      this.highlight = [p];
      this.render();
      await sleep(this.delay);
      this.bits[p] = 1;
      this.render();
    }
    this.added.add(word);
    this.highlight = [];
    this.render();
    setStat("bloom-added", this.added.size);
    this._updateFpr();
    log(this.logId, `"${word}" added. Bits set: ${this.bits.filter(b => b).length}/${this.m}`, "ok");
    this.running = false;
  }

  async query(word) {
    if (this.running || !word) return;
    this.running = true;
    word = word.toLowerCase().trim();
    const positions = this._positions(word);
    log(this.logId, `Query "${word}" → checking positions [${positions.join(", ")}]`, "info");
    let allSet = true;
    for (const p of positions) {
      this.highlight = [p];
      this.render();
      await sleep(this.delay);
      if (!this.bits[p]) {
        allSet = false;
        log(this.logId, `Bit ${p} is 0 → definitely NOT present, stopping early`, "err");
        break;
      }
    }
    this.highlight = [];
    if (!allSet) {
      log(this.logId, `"${word}": MISS (definite negative)`, "err");
    } else if (this.added.has(word)) {
      log(this.logId, `"${word}": HIT — true positive (was actually added)`, "ok");
    } else {
      log(this.logId, `"${word}": HIT but never added — FALSE POSITIVE (all ${this.k} bits happened to be set by other items)`, "warn");
    }
    this.render();
    this.running = false;
  }

  _updateFpr() {
    const setBits = this.bits.filter(b => b).length;
    const fillRatio = setBits / this.m;
    const fpr = Math.pow(fillRatio, this.k);
    setStat("bloom-fpr", (fpr * 100).toFixed(1) + "%");
  }

  render() {
    const el = document.getElementById(this.containerId);
    if (!el) return;
    el.innerHTML = "";
    el.style.display = "flex";
    el.style.flexWrap = "wrap";
    el.style.gap = "3px";
    this.bits.forEach((b, i) => {
      const cell = document.createElement("div");
      cell.className = "dsa-cell";
      cell.style.width = "28px"; cell.style.height = "28px"; cell.style.fontSize = "0.7rem";
      cell.textContent = b;
      if (this.highlight.includes(i)) cell.classList.add("current");
      else if (b) cell.classList.add("optimal");
      el.appendChild(cell);
    });
  }
}

// ── DSA: Aho-Corasick (multi-pattern matching) ───────────────────
class AhoCorasickViz {
  constructor(canvasId, stripId, logId) {
    this.canvasId = canvasId;
    this.stripId = stripId;
    this.logId = logId;
    this.delay = 380;
    this.patterns = ["he", "she", "his", "hers"];
    this.reset();
  }

  reset() {
    this.running = false;
    this.root = { char: "•", children: {}, fail: null, output: [] };
    this.root.fail = this.root;
    for (const p of this.patterns) this._insert(p);
    this._buildFailureLinks();
    this.current = null;
    this.text = "ushersheishishers";
    this.textPos = -1;
    this.matches = [];
    this.render();
    this.renderStrip();
    log(this.logId, `Trie built for patterns: ${this.patterns.join(", ")}. Failure links computed (dashed purple).`, "info");
  }

  _insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = { char: ch, children: {}, fail: null, output: [] };
      node = node.children[ch];
    }
    node.output.push(word);
  }

  _buildFailureLinks() {
    // BFS over the trie, computing each node's failure link — the longest
    // proper suffix of its path that is also a prefix in the trie (a node).
    const queue = [];
    for (const ch of Object.keys(this.root.children)) {
      const child = this.root.children[ch];
      child.fail = this.root;
      queue.push(child);
    }
    while (queue.length) {
      const u = queue.shift();
      for (const ch of Object.keys(u.children)) {
        const c = u.children[ch];
        let f = u.fail;
        while (f !== this.root && !f.children[ch]) f = f.fail;
        c.fail = (f.children[ch] && f.children[ch] !== c) ? f.children[ch] : this.root;
        c.output = c.output.concat(c.fail.output);
        queue.push(c);
      }
    }
  }

  async scan(text) {
    if (this.running || !text) return;
    this.running = true;
    this.text = text.toLowerCase();
    this.matches = [];
    this.textPos = -1;
    let node = this.root;
    log(this.logId, `Scanning "${this.text}" — one pass, no re-reading text characters`, "info");
    for (let i = 0; i < this.text.length; i++) {
      const ch = this.text[i];
      while (node !== this.root && !node.children[ch]) {
        log(this.logId, `No child '${ch}' from '${node.char}' → follow failure link to '${node.fail.char}'`, "warn");
        node = node.fail;
        this.current = node;
        this.render();
        await sleep(this.delay / 2);
      }
      node = node.children[ch] || this.root;
      this.current = node;
      this.textPos = i;
      this.render();
      this.renderStrip();
      await sleep(this.delay);
      if (node.output.length) {
        for (const pat of node.output) {
          const start = i - pat.length + 1;
          this.matches.push({ start, end: i, pat });
          log(this.logId, `Match "${pat}" at [${start}, ${i}]`, "ok");
        }
        this.renderStrip();
      }
    }
    log(this.logId, `Done. ${this.matches.length} match(es) found in one left-to-right pass.`, "ok");
    this.current = null;
    this.render();
    this.running = false;
  }

  render() {
    const canvas = document.getElementById(this.canvasId);
    const sized = sizeCanvas(canvas, 280);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const countLeaves = node => {
      const keys = Object.keys(node.children);
      if (!keys.length) return 1;
      return keys.reduce((s, k) => s + countLeaves(node.children[k]), 0);
    };
    const layout = (node, depth, xStart, xEnd) => {
      node.y = 20 + depth * 42;
      const keys = Object.keys(node.children).sort();
      if (!keys.length) { node.x = (xStart + xEnd) / 2; return; }
      let cursor = xStart;
      const total = countLeaves(node);
      keys.forEach(k => {
        const child = node.children[k];
        const w = (xEnd - xStart) * (countLeaves(child) / total);
        layout(child, depth + 1, cursor, cursor + w);
        cursor += w;
      });
      node.x = (xStart + xEnd) / 2;
    };
    layout(this.root, 0, 10, W - 10);

    const drawFail = node => {
      if (node.fail && node.fail !== this.root && node !== this.root) {
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.fail.x, node.fail.y);
        ctx.strokeStyle = "#7e57c2";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      Object.values(node.children).forEach(drawFail);
    };
    drawFail(this.root);

    const drawEdges = node => {
      Object.values(node.children).forEach(child => {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(child.x, child.y);
        ctx.strokeStyle = (this.current && (node === this.current || child === this.current)) ? "#f57f17" : "#445";
        ctx.lineWidth = 2;
        ctx.stroke();
        drawEdges(child);
      });
    };
    drawEdges(this.root);

    const drawNodes = node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 13, 0, Math.PI * 2);
      ctx.fillStyle = node === this.current ? "#b71c1c" : (node.output.length ? "#1b5e20" : "#37474f");
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.char, node.x, node.y);
      Object.values(node.children).forEach(drawNodes);
    };
    drawNodes(this.root);
  }

  renderStrip() {
    const el = document.getElementById(this.stripId);
    if (!el) return;
    el.innerHTML = "";
    el.style.display = "flex";
    el.style.flexWrap = "wrap";
    el.style.gap = "2px";
    [...this.text].forEach((ch, idx) => {
      const cell = document.createElement("div");
      cell.className = "dsa-cell";
      cell.style.width = "26px"; cell.style.height = "26px"; cell.style.fontSize = "0.75rem";
      cell.textContent = ch;
      if (idx === this.textPos) cell.classList.add("current");
      if (this.matches.some(m => idx >= m.start && idx <= m.end)) cell.classList.add("optimal");
      el.appendChild(cell);
    });
  }
}

// ── DSA: Trie (prefix tree) ──────────────────────────────────────
class TrieViz {
  constructor(canvasId, logId) {
    this.canvasId = canvasId;
    this.logId = logId;
    this.delay = 380;
    this.reset();
  }

  reset() {
    this.running = false;
    this.root = { char: "•", children: {}, end: false };
    this.highlight = null;
    ["cat", "car", "card", "care", "dog", "do"].forEach(w => this._insertSync(w));
    this.render();
    log(this.logId, "Trie preloaded with: cat, car, card, care, dog, do", "info");
  }

  _insertSync(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = { char: ch, children: {}, end: false };
      node = node.children[ch];
    }
    node.end = true;
  }

  async insert(word) {
    if (this.running || !word) return;
    this.running = true;
    word = word.toLowerCase();
    log(this.logId, `Insert "${word}"`, "info");
    let node = this.root;
    const path = [node];
    for (const ch of word) {
      if (!node.children[ch]) {
        node.children[ch] = { char: ch, children: {}, end: false };
        log(this.logId, `Create new node for '${ch}'`, "ok");
      }
      node = node.children[ch];
      path.push(node);
      this.highlight = path.slice();
      this.render();
      await sleep(this.delay);
    }
    node.end = true;
    log(this.logId, `Mark end-of-word at '${node.char}'`, "ok");
    this.highlight = null;
    this.render();
    this.running = false;
  }

  async search(word) {
    if (this.running || !word) return;
    this.running = true;
    word = word.toLowerCase();
    log(this.logId, `Search "${word}"`, "info");
    let node = this.root;
    const path = [node];
    let found = true;
    for (const ch of word) {
      if (!node.children[ch]) { found = false; log(this.logId, `No child '${ch}' — not found`, "err"); break; }
      node = node.children[ch];
      path.push(node);
      this.highlight = path.slice();
      this.render();
      await sleep(this.delay);
    }
    if (found) log(this.logId, node.end ? `"${word}" is a complete word` : `"${word}" is a prefix but not a complete word`, node.end ? "ok" : "warn");
    await sleep(this.delay);
    this.highlight = null;
    this.render();
    this.running = false;
  }

  render() {
    const canvas = document.getElementById(this.canvasId);
    const sized = sizeCanvas(canvas, 320);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const countLeaves = node => {
      const keys = Object.keys(node.children);
      if (!keys.length) return 1;
      return keys.reduce((s, k) => s + countLeaves(node.children[k]), 0);
    };
    const layout = (node, depth, xStart, xEnd) => {
      node.y = 22 + depth * 40;
      const keys = Object.keys(node.children).sort();
      if (!keys.length) { node.x = (xStart + xEnd) / 2; return; }
      let cursor = xStart;
      const total = countLeaves(node);
      keys.forEach(k => {
        const child = node.children[k];
        const w = (xEnd - xStart) * (countLeaves(child) / total);
        layout(child, depth + 1, cursor, cursor + w);
        cursor += w;
      });
      node.x = (xStart + xEnd) / 2;
    };
    layout(this.root, 0, 10, W - 10);
    const inHighlight = node => this.highlight && this.highlight.includes(node);
    const drawEdges = node => {
      Object.values(node.children).forEach(child => {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(child.x, child.y);
        ctx.strokeStyle = (inHighlight(node) && inHighlight(child)) ? "#f57f17" : "#445";
        ctx.lineWidth = 2;
        ctx.stroke();
        drawEdges(child);
      });
    };
    drawEdges(this.root);
    const drawNodes = node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = inHighlight(node) ? "#b71c1c" : (node.end ? "#1b5e20" : "#37474f");
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.char, node.x, node.y);
      Object.values(node.children).forEach(drawNodes);
    };
    drawNodes(this.root);
  }
}

// ── DSA: Greedy interval scheduling ─────────────────────────────
class GreedyViz {
  constructor(canvasId, logId) {
    this.canvasId = canvasId;
    this.logId = logId;
    this.delay = 600;
    this.reset();
  }

  reset() {
    this.running = false;
    this.intervals = [
      { s: 1, e: 4, l: "A" }, { s: 3, e: 5, l: "B" }, { s: 0, e: 6, l: "C" }, { s: 5, e: 7, l: "D" },
      { s: 3, e: 9, l: "E" }, { s: 5, e: 9, l: "F" }, { s: 6, e: 10, l: "G" }, { s: 8, e: 11, l: "H" },
      { s: 8, e: 12, l: "I" }, { s: 2, e: 14, l: "J" }, { s: 12, e: 16, l: "K" },
    ];
    this.intervals.forEach(iv => iv.state = "pending");
    setStat("greedy-count", "—");
    this.render();
    log(this.logId, `${this.intervals.length} intervals loaded. Greedy: sort by end time, accept if compatible.`, "info");
  }

  async run() {
    if (this.running) return;
    this.running = true;
    this.intervals.forEach(iv => iv.state = "pending");
    const sorted = [...this.intervals].sort((a, b) => a.e - b.e);
    log(this.logId, `Sorted by end time: ${sorted.map(i => i.l).join(", ")}`, "info");
    let lastEnd = -Infinity;
    let count = 0;
    for (const iv of sorted) {
      iv.state = "current";
      this.render();
      await sleep(this.delay);
      if (iv.s >= lastEnd) {
        iv.state = "accepted";
        lastEnd = iv.e;
        count++;
        log(this.logId, `Accept ${iv.l} [${iv.s},${iv.e}] — starts at/after last accepted end`, "ok");
      } else {
        iv.state = "rejected";
        log(this.logId, `Reject ${iv.l} [${iv.s},${iv.e}] — overlaps last accepted (ends ${lastEnd})`, "err");
      }
      this.render();
      await sleep(this.delay / 2);
    }
    log(this.logId, `Max non-overlapping intervals: ${count}`, "ok");
    setStat("greedy-count", count);
    this.running = false;
  }

  render() {
    const canvas = document.getElementById(this.canvasId);
    const sized = sizeCanvas(canvas, 300);
    if (!sized) return;
    const { ctx, W, H } = sized;
    clearCanvas(ctx, W, H);
    const maxT = Math.max(...this.intervals.map(i => i.e)) + 1;
    const rowH = (H - 20) / this.intervals.length;
    const colors = { pending: "#37474f", current: "#f57f17", accepted: "#1b5e20", rejected: "#7f1d1d" };
    this.intervals.forEach((iv, i) => {
      const x1 = 10 + (iv.s / maxT) * (W - 20);
      const x2 = 10 + (iv.e / maxT) * (W - 20);
      const y = 10 + i * rowH;
      ctx.fillStyle = colors[iv.state];
      ctx.fillRect(x1, y, x2 - x1, rowH - 6);
      ctx.fillStyle = "#fff";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${iv.l} [${iv.s},${iv.e}]`, x1 + 4, y + (rowH - 6) / 2);
    });
  }
}

// ── DSA: KMP pattern matching ────────────────────────────────────
class KmpViz {
  constructor(containerId, logId) {
    this.containerId = containerId;
    this.logId = logId;
    this.delay = 420;
    this.reset();
  }

  reset() {
    this.running = false;
    this.text = "ababcabcabababd";
    this.pattern = "ababd";
    this.i = -1; this.j = -1;
    this.matches = [];
    this.render();
    log(this.logId, `Text="${this.text}"  Pattern="${this.pattern}"`, "info");
  }

  _lps(pattern) {
    const lps = Array(pattern.length).fill(0);
    let len = 0, i = 1;
    while (i < pattern.length) {
      if (pattern[i] === pattern[len]) { len++; lps[i] = len; i++; }
      else if (len > 0) { len = lps[len - 1]; }
      else { lps[i] = 0; i++; }
    }
    return lps;
  }

  async run() {
    if (this.running) return;
    this.running = true;
    this.matches = [];
    const lps = this._lps(this.pattern);
    log(this.logId, `LPS (failure function) for "${this.pattern}": [${lps.join(",")}]`, "info");
    let i = 0, j = 0;
    while (i < this.text.length) {
      this.i = i; this.j = j;
      this.render();
      await sleep(this.delay);
      if (this.text[i] === this.pattern[j]) {
        i++; j++;
        if (j === this.pattern.length) {
          this.matches.push(i - j);
          log(this.logId, `Match found at index ${i - j}`, "ok");
          j = lps[j - 1];
        }
      } else if (j > 0) {
        log(this.logId, `Mismatch text[${i}]='${this.text[i]}' — fall back j=${j}→${lps[j - 1]} via LPS (text pointer never rewinds)`, "warn");
        j = lps[j - 1];
      } else {
        i++;
      }
    }
    log(this.logId, `Done. Matches at: [${this.matches.join(", ")}]`, "ok");
    this.i = -1; this.j = -1;
    this.render();
    this.running = false;
  }

  render() {
    const el = document.getElementById(this.containerId);
    if (!el) return;
    el.innerHTML = "";
    const textRow = document.createElement("div");
    textRow.style.display = "flex"; textRow.style.gap = "2px"; textRow.style.marginBottom = "8px"; textRow.style.flexWrap = "wrap";
    [...this.text].forEach((ch, idx) => {
      const cell = document.createElement("div");
      cell.className = "dsa-cell";
      cell.style.width = "28px"; cell.style.height = "28px"; cell.style.fontSize = "0.8rem";
      cell.textContent = ch;
      if (idx === this.i) cell.classList.add("current");
      if (this.matches.some(m => idx >= m && idx < m + this.pattern.length)) cell.classList.add("optimal");
      textRow.appendChild(cell);
    });
    const patRow = document.createElement("div");
    patRow.style.display = "flex"; patRow.style.gap = "2px";
    patRow.style.marginLeft = (this.i >= 0 ? Math.max(0, this.i - this.j) : 0) * 30 + "px";
    [...this.pattern].forEach((ch, idx) => {
      const cell = document.createElement("div");
      cell.className = "dsa-cell";
      cell.style.width = "28px"; cell.style.height = "28px"; cell.style.fontSize = "0.8rem";
      cell.textContent = ch;
      if (idx === this.j) cell.classList.add("active");
      patRow.appendChild(cell);
    });
    el.appendChild(textRow);
    el.appendChild(patRow);
  }
}

// ── DSA: Count-Min Sketch ─────────────────────────────────────
class CountMinSketchViz {
  constructor(gridId, logId) {
    this.gridId = gridId;
    this.logId = logId;
    this.d = 3;
    this.w = 8;
    this.delay = 180;
    this.reset();
  }

  reset() {
    this.generation = (this.generation || 0) + 1;
    this.running = false;
    this.table = Array.from({ length: this.d }, () => Array(this.w).fill(0));
    this.trueCount = {};
    this.adds = 0;
    this.highlight = [];
    this.render();
    setStat("cms-adds", 0);
    setStat("cms-est", "—");
    setStat("cms-true", "—");
    log(this.logId, `Reset: ${this.d} rows × ${this.w} counters. Estimate = min across rows.`, "info");
  }

  _idx(word, row) {
    let h = (row + 1) * 2654435761;
    for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 1597334677);
    return Math.abs(h) % this.w;
  }

  async add(word) {
    if (this.running || !word) return;
    this.running = true;
    const generation = this.generation;
    word = word.toLowerCase().trim();
    this.trueCount[word] = (this.trueCount[word] || 0) + 1;
    this.adds++;
    const cols = [];
    for (let r = 0; r < this.d; r++) cols.push(this._idx(word, r));
    log(this.logId, `Add "${word}" → columns [${cols.join(", ")}]`, "info");
    for (let r = 0; r < this.d; r++) {
      this.highlight = [[r, cols[r]]];
      this.render();
      await sleep(this.delay);
      if (generation !== this.generation) return;
      this.table[r][cols[r]]++;
      this.render();
    }
    this.highlight = [];
    this.render();
    setStat("cms-adds", this.adds);
    log(this.logId, `"${word}" true count = ${this.trueCount[word]}`, "ok");
    this.running = false;
  }

  async query(word) {
    if (this.running || !word) return;
    this.running = true;
    word = word.toLowerCase().trim();
    const cols = [];
    const vals = [];
    for (let r = 0; r < this.d; r++) {
      cols.push(this._idx(word, r));
      vals.push(this.table[r][cols[r]]);
    }
    log(this.logId, `Query "${word}" → cells ${vals.join(", ")}`, "info");
    for (let r = 0; r < this.d; r++) {
      this.highlight = [[r, cols[r]]];
      this.render();
      await sleep(this.delay);
    }
    const est = Math.min(...vals);
    const truth = this.trueCount[word] || 0;
    setStat("cms-est", est);
    setStat("cms-true", truth);
    this.highlight = [];
    this.render();
    if (est === truth) log(this.logId, `estimate=${est} equals true count (no extra collisions on the min cell)`, "ok");
    else if (truth === 0 && est > 0) log(this.logId, `estimate=${est} but never added — overestimate from collisions`, "warn");
    else log(this.logId, `estimate=${est} ≥ true ${truth} (Count-Min never underestimates non-negative adds)`, "warn");
    this.running = false;
  }

  render() {
    const el = document.getElementById(this.gridId);
    if (!el) return;
    el.innerHTML = "";
    this.table.forEach((row, r) => {
      const line = document.createElement("div");
      line.style.display = "flex";
      line.style.gap = "4px";
      line.style.marginBottom = "4px";
      const lab = document.createElement("span");
      lab.style.cssText = "width:48px;color:#90caf9;font-size:0.75rem;line-height:28px";
      lab.textContent = "row " + r;
      line.appendChild(lab);
      row.forEach((v, c) => {
        const cell = document.createElement("div");
        cell.className = "dsa-cell";
        cell.style.width = "32px";
        cell.style.height = "28px";
        cell.style.fontSize = "0.75rem";
        cell.textContent = v;
        if (this.highlight.some(([hr, hc]) => hr === r && hc === c)) cell.classList.add("current");
        else if (v) cell.classList.add("optimal");
        line.appendChild(cell);
      });
      el.appendChild(line);
    });
  }
}

// ── DSA: Skip list ────────────────────────────────────────────
class SkipListViz {
  constructor(viewId, logId) {
    this.viewId = viewId;
    this.logId = logId;
    this.maxLevel = 4;
    this.reset();
  }

  reset() {
    this.level = 1;
    this.head = { key: -Infinity, forward: Array(this.maxLevel).fill(null) };
    this.size = 0;
    this.highlight = new Set();
    this.render();
    setStat("skip-n", 0);
    setStat("skip-lvl", 0);
    log(this.logId, "Empty skip list. Insert keys; height is a coin flip (p=0.5).", "info");
  }

  _randomLevel() {
    let lvl = 1;
    while (Math.random() < 0.5 && lvl < this.maxLevel) lvl++;
    return lvl;
  }

  _path(key) {
    const update = Array(this.maxLevel);
    const visited = [];
    let cur = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (cur.forward[i] && cur.forward[i].key < key) {
        cur = cur.forward[i];
        visited.push(cur.key);
      }
      update[i] = cur;
    }
    return { update, visited, next: cur.forward[0] };
  }

  insert(key) {
    if (!Number.isFinite(key)) return;
    const { update } = this._path(key);
    if (update[0].forward[0] && update[0].forward[0].key === key) {
      log(this.logId, `${key} already present`, "warn");
      return;
    }
    const lvl = this._randomLevel();
    if (lvl > this.level) {
      for (let i = this.level; i < lvl; i++) update[i] = this.head;
      this.level = lvl;
    }
    const node = { key, forward: Array(lvl).fill(null) };
    for (let i = 0; i < lvl; i++) {
      node.forward[i] = update[i].forward[i];
      update[i].forward[i] = node;
    }
    this.size++;
    this.highlight = new Set([key]);
    this.render();
    setStat("skip-n", this.size);
    setStat("skip-lvl", this.level);
    log(this.logId, `Insert ${key} at height ${lvl}`, "ok");
  }

  search(key) {
    if (!Number.isFinite(key)) return;
    const { visited, next } = this._path(key);
    const hit = next && next.key === key;
    this.highlight = new Set(visited.concat(hit ? [key] : []));
    this.render();
    log(this.logId, hit ? `Found ${key}. Path touched [${visited.join(" → ") || "HEAD"}]` : `${key} not found. Path [${visited.join(" → ") || "HEAD"}]`, hit ? "ok" : "err");
  }

  render() {
    const el = document.getElementById(this.viewId);
    if (!el) return;
    const rows = [];
    for (let i = this.level - 1; i >= 0; i--) {
      const keys = [];
      let cur = this.head.forward[i];
      while (cur) {
        keys.push(cur.key);
        cur = cur.forward[i];
      }
      const cells = keys.map((k) => {
        const on = this.highlight.has(k);
        const bg = on ? "#e65100" : "#1a237e";
        return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:4px;margin-right:6px">${k}</span>`;
      });
      rows.push(`<div><span style="color:#90caf9;display:inline-block;width:2.5rem">L${i}</span> HEAD ${cells.join("— ") || "(empty)"} — NIL</div>`);
    }
    el.innerHTML = rows.join("");
  }
}

// ── DSA: Fenwick tree ─────────────────────────────────────────
class FenwickViz {
  constructor() {
    this.n = 8;
    this.base = [3, 2, -1, 6, 5, 4, 2, 3];
    this.reset();
  }

  reset() {
    this.arr = this.base.slice();
    this.bit = Array(this.n + 1).fill(0);
    for (let i = 1; i <= this.n; i++) this._addSilent(i, this.arr[i - 1]);
    this.hiArr = new Set();
    this.hiBit = new Set();
    this.render();
    setStat("fw-pref", "—");
    setStat("fw-range", "—");
    log("fw-log", "Array restored. bit[i] stores a power-of-two range ending at i (1-based).", "info");
  }

  _addSilent(i, delta) {
    while (i <= this.n) {
      this.bit[i] += delta;
      i += i & -i;
    }
  }

  add(i, delta) {
    this.arr[i - 1] += delta;
    this.hiArr = new Set([i]);
    this.hiBit = new Set();
    let x = i;
    while (x <= this.n) {
      this.bit[x] += delta;
      this.hiBit.add(x);
      x += x & -x;
    }
    this.render();
    log("fw-log", `add(${i}, ${delta}) touched bit indexes {${[...this.hiBit].join(", ")}}`, "ok");
  }

  prefix(i) {
    this.hiArr = new Set();
    this.hiBit = new Set();
    let s = 0, x = i;
    while (x > 0) {
      s += this.bit[x];
      this.hiBit.add(x);
      x -= x & -x;
    }
    this.render();
    setStat("fw-pref", s);
    log("fw-log", `prefix(${i}) = ${s} via bits {${[...this.hiBit].join(", ")}}`, "ok");
    return s;
  }

  range(l, r) {
    const left = l > 1 ? this._prefixQuiet(l - 1) : 0;
    const right = this._prefixQuiet(r);
    setStat("fw-range", right - left);
    this.hiArr = new Set();
    this.hiBit = new Set();
    let x = r;
    while (x > 0) { this.hiBit.add(x); x -= x & -x; }
    this.render();
    log("fw-log", `range[${l},${r}] = prefix(${r}) - prefix(${l - 1}) = ${right - left}`, "ok");
  }

  _prefixQuiet(i) {
    let s = 0;
    while (i > 0) {
      s += this.bit[i];
      i -= i & -i;
    }
    return s;
  }

  render() {
    const paint = (elId, values, oneBased, hi) => {
      const el = document.getElementById(elId);
      if (!el) return;
      el.innerHTML = "";
      const lab = document.createElement("span");
      lab.style.cssText = "color:#90caf9;font-size:0.75rem;margin-right:8px";
      lab.textContent = oneBased ? "bit[]" : "a[]";
      el.appendChild(lab);
      values.forEach((v, idx) => {
        const i = oneBased ? idx : idx + 1;
        if (oneBased && idx === 0) return;
        const cell = document.createElement("div");
        cell.className = "dsa-cell";
        cell.style.width = "40px";
        cell.style.fontSize = "0.75rem";
        cell.innerHTML = `<div style="font-size:0.6rem;opacity:.7">${oneBased ? idx : i}</div>${v}`;
        if (hi.has(oneBased ? idx : i)) cell.classList.add("current");
        el.appendChild(cell);
      });
      el.style.display = "flex";
      el.style.flexWrap = "wrap";
      el.style.alignItems = "center";
      el.style.gap = "4px";
    };
    paint("fw-arr", this.arr, false, this.hiArr);
    paint("fw-bit", this.bit, true, this.hiBit);
  }
}

// ── Auto-init ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("ch-ring")) {
    window._ch = new ConsistentHashingRing("ch-ring", "ch-log");
  }
  if (document.getElementById("kafka-canvas") || document.getElementById("kafka-total-lag")) {
    window._kafka = new KafkaSimulator("kafka-canvas", "kafka-log");
  }
  if (document.getElementById("stampede-canvas") || document.getElementById("stampede-cache")) {
    window._stampede = new CacheStampedeSimulator("stampede-canvas", "stampede-log");
  }
  if (document.getElementById("rl-canvas") || document.getElementById("rl-tokens")) {
    window._rl = new RateLimiterSimulator("rl-canvas", "rl-log");
  }
  if (document.getElementById("sw-array")) {
    window._sw = new SlidingWindowViz("sw-array");
    window._sw.init([3, 1, 2, 5, 8, 2, 6, 1, 4, 9, 3]);
  }
  if (document.getElementById("graph-canvas")) {
    window._gv = new GraphViz("graph-canvas", "graph-log");
  }
  if (document.getElementById("shard-canvas")) window._shard = new ShardingSimulator("shard-canvas", "shard-log");
  if (document.getElementById("lb-canvas")) window._lb = new LoadBalancerSim("lb-canvas", "lb-log");
  if (document.getElementById("retry-canvas")) window._retry = new RetryStormSim("retry-canvas", "retry-log");
  if (document.getElementById("cb-canvas")) window._cb = new CircuitBreakerSim("cb-canvas", "cb-log");
  if (document.getElementById("raft-canvas")) window._raft = new RaftSim("raft-canvas", "raft-log");
  if (document.getElementById("saga-canvas")) window._saga = new SagaSim("saga-canvas", "saga-log");
  if (document.getElementById("tail-canvas")) window._tail = new TailLatencySim("tail-canvas", "tail-log");
  if (document.getElementById("dns-canvas")) window._dns = new DnsSim("dns-canvas", "dns-log");
  if (document.getElementById("tcp-canvas")) window._tcp = new TcpSim("tcp-canvas", "tcp-log");
  if (document.getElementById("k8s-canvas")) window._k8s = new K8sSim("k8s-canvas", "k8s-log");
  if (document.getElementById("fw-body")) window._fw = new FrameworkWalkthrough();
  if (document.getElementById("cap-dau")) {
    window._cap = new CapacityCalc();
    window._cap.compute();
  }
  if (document.getElementById("ll-lambda")) window._math = new MathCalc();
  if (document.getElementById("dp-grid")) window._dp = new DpViz();
  if (document.getElementById("heap-canvas")) window._heap = new HeapViz("heap-canvas", "heap-log");
  if (document.getElementById("dijkstra-canvas")) window._dijkstra = new DijkstraViz("dijkstra-canvas", "dijkstra-log");
  if (document.getElementById("uf-canvas")) window._uf = new UnionFindViz("uf-canvas", "uf-log");
  if (document.getElementById("nqueens-board")) window._nq = new NQueensViz("nqueens-board", "nqueens-log");
  if (document.getElementById("sort-canvas")) window._sort = new SortViz("sort-canvas", "sort-log");
  if (document.getElementById("trie-canvas")) window._trie = new TrieViz("trie-canvas", "trie-log");
  if (document.getElementById("greedy-canvas")) window._greedy = new GreedyViz("greedy-canvas", "greedy-log");
  if (document.getElementById("kmp-strip")) window._kmp = new KmpViz("kmp-strip", "kmp-log");
  if (document.getElementById("bloom-bits")) window._bloom = new BloomFilterViz("bloom-bits", "bloom-log");
  if (document.getElementById("ac-canvas")) window._ac = new AhoCorasickViz("ac-canvas", "ac-strip", "ac-log");
  if (document.getElementById("cms-grid")) window._cms = new CountMinSketchViz("cms-grid", "cms-log");
  if (document.getElementById("skip-view")) window._skip = new SkipListViz("skip-view", "skip-log");
  if (document.getElementById("fw-arr")) window._fenwick = new FenwickViz();
});

// Expose constructors for tests / playgrounds
window.AcademySims = {
  ConsistentHashingRing, KafkaSimulator, CacheStampedeSimulator, RateLimiterSimulator,
  ShardingSimulator, LoadBalancerSim, RetryStormSim, CircuitBreakerSim, RaftSim,
  SagaSim, TailLatencySim, DnsSim, TcpSim, K8sSim, CapacityCalc, MathCalc,
  SlidingWindowViz, GraphViz, DpViz, FrameworkWalkthrough,
  HeapViz, DijkstraViz, UnionFindViz, NQueensViz, SortViz, TrieViz, GreedyViz, KmpViz,
  CountMinSketchViz, SkipListViz, FenwickViz,
};
