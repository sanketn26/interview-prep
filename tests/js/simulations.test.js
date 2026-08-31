"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..", "..");
const simulationsPath = path.join(root, "docs", "assets", "js", "simulations.js");
const progressPath = path.join(root, "docs", "assets", "js", "progress.js");

assert.ok(fs.existsSync(simulationsPath), "simulations.js must exist under docs/assets/js");
assert.ok(fs.existsSync(progressPath), "progress.js must exist under docs/assets/js");

const simulationsSrc = fs.readFileSync(simulationsPath, "utf8");
const progressSrc = fs.readFileSync(progressPath, "utf8");
assert.ok(simulationsSrc.length > 100, "simulations.js is unexpectedly empty");
assert.ok(progressSrc.length > 100, "progress.js is unexpectedly empty");

new vm.Script(simulationsSrc, { filename: "simulations.js" });
new vm.Script(progressSrc, { filename: "progress.js" });

const expectedClasses = [
  "ConsistentHashingRing",
  "KafkaSimulator",
  "CacheStampedeSimulator",
  "RateLimiterSimulator",
  "ShardingSimulator",
  "ReplicationSimulator",
  "CacheCapacitySimulator",
  "LoadBalancerSim",
  "RetryStormSim",
  "CircuitBreakerSim",
  "RaftSim",
  "SagaSim",
  "TailLatencySim",
  "DnsSim",
  "TcpSim",
  "K8sSim",
  "CapacityCalc",
];

for (const name of expectedClasses) {
  assert.match(
    simulationsSrc,
    new RegExp(`class ${name}\\b`),
    `expected class ${name} in simulations.js`
  );
}

const requiredHooks = [
  "setHotKey",
  "killConsumer",
  "injectFailure",
  "killLeader",
  "latencySpike",
  "slowDownstream",
  "expireKey",
];

for (const hook of requiredHooks) {
  assert.match(simulationsSrc, new RegExp(`\\b${hook}\\s*\\(`), `expected method ${hook}()`);
}

console.log(
  `simulations.test.js ok (${expectedClasses.length} classes, ${requiredHooks.length} hooks)`
);
