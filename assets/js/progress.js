/* Progress tracking, gamification, and dashboard rendering. No backend — everything lives in localStorage. */

const PAGE_REGISTRY = [
  // System Design
  { id: "foundations/", title: "System Design Fundamentals", section: "System Design" },
  { id: "foundations/requirements-estimation/", title: "Requirements & Estimation", section: "System Design" },
  { id: "foundations/framework/", title: "System Design Framework", section: "System Design" },
  { id: "foundations/math/", title: "Engineering Mathematics", section: "System Design" },
  { id: "distributed-systems/", title: "Distributed Systems", section: "System Design" },
  { id: "distributed-systems/cap-theorem/", title: "CAP Theorem", section: "System Design" },
  { id: "distributed-systems/consistency-models/", title: "Consistency Models", section: "System Design" },
  { id: "distributed-systems/replication/", title: "Replication", section: "System Design" },
  { id: "distributed-systems/raft/", title: "Consensus & Raft", section: "System Design" },
  { id: "databases/", title: "Databases", section: "System Design" },
  { id: "databases/sharding/", title: "Database Sharding", section: "System Design" },
  { id: "databases/consistent-hashing/", title: "Consistent Hashing", section: "System Design" },
  { id: "databases/sql-vs-nosql/", title: "SQL vs NoSQL", section: "System Design" },
  { id: "databases/indexing/", title: "Indexing & Storage", section: "System Design" },
  { id: "performance/", title: "Caching & Performance", section: "System Design" },
  { id: "performance/cache-stampede/", title: "Cache Stampede", section: "System Design" },
  { id: "performance/cache-strategies/", title: "Cache Strategies", section: "System Design" },
  { id: "performance/tail-latency/", title: "Tail Latency", section: "System Design" },
  { id: "messaging/", title: "Messaging", section: "System Design" },
  { id: "messaging/kafka/", title: "Kafka Deep Dive", section: "System Design" },
  { id: "messaging/patterns/", title: "Message Queue Patterns", section: "System Design" },
  { id: "architecture-patterns/", title: "Architecture Patterns", section: "System Design" },
  { id: "architecture-patterns/sagas/", title: "Sagas", section: "System Design" },
  { id: "networking/", title: "Networking", section: "System Design" },
  { id: "networking/http-tcp/", title: "HTTP & TCP Deep Dive", section: "System Design" },
  { id: "networking/load-balancing/", title: "Load Balancing", section: "System Design" },
  { id: "reliability/", title: "Reliability", section: "System Design" },
  { id: "reliability/circuit-breakers/", title: "Circuit Breakers", section: "System Design" },
  { id: "reliability/rate-limiting/", title: "Rate Limiting", section: "System Design" },
  { id: "observability/", title: "Observability", section: "System Design" },
  { id: "security/", title: "Security", section: "System Design" },
  { id: "cloud/", title: "Cloud", section: "System Design" },
  { id: "kubernetes/", title: "Kubernetes", section: "System Design" },
  { id: "ai-native/", title: "AI-Native Systems", section: "System Design" },

  // Design Exercises
  { id: "system-design-exercises/url-shortener/", title: "URL Shortener", section: "Design Exercises" },
  { id: "system-design-exercises/rate-limiter/", title: "Rate Limiter", section: "Design Exercises" },
  { id: "system-design-exercises/distributed-cache/", title: "Distributed Cache", section: "Design Exercises" },
  { id: "system-design-exercises/load-balancer/", title: "Load Balancer", section: "Design Exercises" },
  { id: "system-design-exercises/autocomplete/", title: "Autocomplete / Typeahead", section: "Design Exercises" },
  { id: "system-design-exercises/api-gateway/", title: "API Gateway", section: "Design Exercises" },
  { id: "system-design-exercises/distributed-kv-store/", title: "Distributed KV Store", section: "Design Exercises" },
  { id: "system-design-exercises/web-crawler/", title: "Web Crawler", section: "Design Exercises" },
  { id: "system-design-exercises/payment-processing/", title: "Payment Processing", section: "Design Exercises" },
  { id: "system-design-exercises/whatsapp/", title: "WhatsApp / Messaging", section: "Design Exercises" },
  { id: "system-design-exercises/notification-system/", title: "Notification System", section: "Design Exercises" },
  { id: "system-design-exercises/social-feed/", title: "Social Feed (Twitter/X)", section: "Design Exercises" },

  // DSA
  { id: "dsa/foundations/", title: "DSA Foundations", section: "DSA" },
  { id: "dsa/sliding-window/", title: "Sliding Window", section: "DSA" },
  { id: "dsa/two-pointers/", title: "Two Pointers", section: "DSA" },
  { id: "dsa/binary-search/", title: "Binary Search", section: "DSA" },
  { id: "dsa/bfs-dfs/", title: "BFS & DFS", section: "DSA" },
  { id: "dsa/dynamic-programming/", title: "Dynamic Programming", section: "DSA" },
  { id: "dsa/pattern-recognition/", title: "Pattern Recognition", section: "DSA" },

  // Behavioural
  { id: "behavioural/framework/", title: "STAR + Reflection Framework", section: "Behavioural" },
  { id: "behavioural/technical-disagreement/", title: "Technical Disagreement", section: "Behavioural" },
  { id: "behavioural/production-incident/", title: "Leading a Production Incident", section: "Behavioural" },
  { id: "behavioural/failure-learning/", title: "Failure & Learning", section: "Behavioural" },

  // Production Engineering
  { id: "reliability/failure-library/", title: "Failure Library", section: "Production Engineering" },
  { id: "observability/debugging-playbook/", title: "Debugging Playbook", section: "Production Engineering" },

  // Reference
  { id: "reference/cheat-sheets/", title: "Cheat Sheets", section: "Reference" },
  { id: "reference/calculators/", title: "Calculators", section: "Reference" },
  { id: "reference/glossary/", title: "Glossary", section: "Reference" },
  { id: "reference/tradeoff-matrix/", title: "Trade-Off Matrix", section: "Reference" },

  // Getting Started
  { id: "interview-playbook/framework/", title: "Interview Framework", section: "Getting Started" },
];

const SECTION_ORDER = [
  "Getting Started",
  "System Design",
  "Design Exercises",
  "DSA",
  "Behavioural",
  "Production Engineering",
  "Reference",
];

const BADGES = [
  { id: "first-step", label: "First Step", desc: "Complete your first page", check: (s) => s.completedCount >= 1 },
  { id: "getting-serious", label: "Getting Serious", desc: "Complete 10 pages", check: (s) => s.completedCount >= 10 },
  { id: "quarter", label: "Quarter Way", desc: "Reach 25% completion", check: (s) => s.percent >= 25 },
  { id: "halfway", label: "Halfway There", desc: "Reach 50% completion", check: (s) => s.percent >= 50 },
  { id: "three-quarters", label: "Almost There", desc: "Reach 75% completion", check: (s) => s.percent >= 75 },
  { id: "completionist", label: "Completionist", desc: "Complete 100% of the curriculum", check: (s) => s.percent >= 100 },
  { id: "streak-3", label: "3-Day Streak", desc: "Study 3 days in a row", check: (s) => s.streak.best >= 3 },
  { id: "streak-7", label: "7-Day Streak", desc: "Study 7 days in a row", check: (s) => s.streak.best >= 7 },
  { id: "point-master", label: "Point Master", desc: "Earn 500 points", check: (s) => s.points >= 500 },
];

const LEVELS = [
  { min: 0, title: "Trainee" },
  { min: 100, title: "Practitioner" },
  { min: 250, title: "Senior-Ready" },
  { min: 450, title: "Staff-Ready" },
  { min: 620, title: "Principal Track" },
];

const STORAGE_KEY = "academy.progress.v1";
const POINTS_PER_PAGE = 10;

const ProgressStore = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this._empty();
      const parsed = JSON.parse(raw);
      return Object.assign(this._empty(), parsed);
    } catch (e) {
      return this._empty();
    }
  },

  _empty() {
    return {
      completed: {},
      toggledOff: {},
      streak: { current: 0, best: 0, lastActiveDate: null },
      points: 0,
    };
  },

  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage unavailable (private mode / disabled) — fail silently */
    }
  },

  _today() {
    return new Date().toISOString().slice(0, 10);
  },

  _bumpStreak(state) {
    const today = this._today();
    const last = state.streak.lastActiveDate;
    if (last === today) return; // already counted today
    if (last) {
      const dayMs = 24 * 60 * 60 * 1000;
      const gap = Math.round((new Date(today) - new Date(last)) / dayMs);
      state.streak.current = gap === 1 ? state.streak.current + 1 : 1;
    } else {
      state.streak.current = 1;
    }
    state.streak.lastActiveDate = today;
    state.streak.best = Math.max(state.streak.best, state.streak.current);
  },

  isComplete(id) {
    const state = this.load();
    return Boolean(state.completed[id]) && !state.toggledOff[id];
  },

  markComplete(id) {
    const state = this.load();
    const firstTime = !state.completed[id];
    if (firstTime) {
      state.completed[id] = new Date().toISOString();
      state.points += POINTS_PER_PAGE;
    }
    delete state.toggledOff[id];
    this._bumpStreak(state);
    this.save(state);
    return state;
  },

  unmark(id) {
    const state = this.load();
    state.toggledOff[id] = true;
    this.save(state);
    return state;
  },

  reset() {
    this.save(this._empty());
  },

  getStats() {
    const state = this.load();
    const totalPages = PAGE_REGISTRY.length;
    let completedCount = 0;
    const bySection = {};
    SECTION_ORDER.forEach((s) => (bySection[s] = { completed: 0, total: 0 }));

    PAGE_REGISTRY.forEach((page) => {
      bySection[page.section].total += 1;
      const done = Boolean(state.completed[page.id]) && !state.toggledOff[page.id];
      if (done) {
        completedCount += 1;
        bySection[page.section].completed += 1;
      }
    });

    const percent = totalPages === 0 ? 0 : Math.round((completedCount / totalPages) * 100);
    const points = state.points;
    let level = LEVELS[0];
    for (const l of LEVELS) if (points >= l.min) level = l;

    const stats = {
      totalPages,
      completedCount,
      percent,
      points,
      level: level.title,
      streak: state.streak,
      bySection,
    };
    stats.badges = BADGES.map((b) => ({ ...b, earned: b.check(stats) }));
    return stats;
  },
};

function findCurrentPage() {
  const path = window.location.pathname;
  return PAGE_REGISTRY.find((page) => path.endsWith("/" + page.id) || path.endsWith(page.id));
}

function injectMarkCompleteButton() {
  const page = findCurrentPage();
  if (!page) return;

  const h1 = document.querySelector(".md-content__inner h1");
  if (!h1) return;

  const bar = document.createElement("div");
  bar.className = "progress-mark-bar";

  function render() {
    const done = ProgressStore.isComplete(page.id);
    bar.innerHTML = "";
    const btn = document.createElement("button");
    btn.className = "sim-btn" + (done ? " success" : "");
    btn.textContent = done ? "✓ Completed — click to unmark" : "Mark this page complete";
    btn.onclick = () => {
      if (ProgressStore.isComplete(page.id)) {
        ProgressStore.unmark(page.id);
      } else {
        ProgressStore.markComplete(page.id);
      }
      render();
    };
    bar.appendChild(btn);
  }

  render();
  h1.insertAdjacentElement("afterend", bar);
}

function renderDashboard() {
  const root = document.getElementById("academy-dashboard");
  if (!root) return;

  function build() {
    const stats = ProgressStore.getStats();
    root.innerHTML = "";

    // KPI row
    const statsRow = document.createElement("div");
    statsRow.className = "sim-stats";
    const kpis = [
      ["Points", stats.points],
      ["Level", stats.level],
      ["Pages Completed", `${stats.completedCount} / ${stats.totalPages}`],
      ["Overall Progress", `${stats.percent}%`],
      ["Current Streak", `${stats.streak.current}d`],
      ["Best Streak", `${stats.streak.best}d`],
    ];
    kpis.forEach(([label, value]) => {
      const tile = document.createElement("div");
      tile.className = "sim-stat";
      tile.innerHTML = `<div class="sim-stat-label">${label}</div><div class="sim-stat-value">${value}</div>`;
      statsRow.appendChild(tile);
    });
    root.appendChild(statsRow);

    // Overall progress bar
    const overall = document.createElement("div");
    overall.className = "progress-bar";
    overall.innerHTML = `<div class="progress-bar-fill" style="width:${stats.percent}%"></div>`;
    root.appendChild(overall);

    // Per-section breakdown
    const sectionsHeading = document.createElement("h3");
    sectionsHeading.textContent = "Progress by Section";
    root.appendChild(sectionsHeading);

    SECTION_ORDER.forEach((section) => {
      const data = stats.bySection[section];
      if (!data || data.total === 0) return;
      const pct = Math.round((data.completed / data.total) * 100);
      const row = document.createElement("div");
      row.className = "progress-section-row";
      row.innerHTML = `
        <div class="progress-section-label">${section} <span>${data.completed}/${data.total}</span></div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      `;
      root.appendChild(row);
    });

    // Badges
    const badgesHeading = document.createElement("h3");
    badgesHeading.textContent = "Badges";
    root.appendChild(badgesHeading);

    const badgeGrid = document.createElement("div");
    badgeGrid.className = "badge-grid";
    stats.badges.forEach((b) => {
      const el = document.createElement("div");
      el.className = "badge" + (b.earned ? " earned" : " locked");
      el.innerHTML = `<div class="badge-icon">${b.earned ? "🏆" : "🔒"}</div><div class="badge-label">${b.label}</div><div class="badge-desc">${b.desc}</div>`;
      badgeGrid.appendChild(el);
    });
    root.appendChild(badgeGrid);

    // Reset
    const resetBtn = document.createElement("button");
    resetBtn.className = "sim-btn danger";
    resetBtn.textContent = "Reset Progress";
    resetBtn.style.marginTop = "1.5rem";
    resetBtn.onclick = () => {
      if (confirm("Reset all progress? This cannot be undone.")) {
        ProgressStore.reset();
        build();
      }
    };
    root.appendChild(resetBtn);
  }

  build();
}

document.addEventListener("DOMContentLoaded", () => {
  injectMarkCompleteButton();
  renderDashboard();
});

window.AcademyProgress = { ProgressStore, PAGE_REGISTRY, BADGES };
