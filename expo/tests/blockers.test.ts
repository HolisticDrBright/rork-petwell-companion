import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import { computeHealthScore } from "../lib/health/score";
import { trendsFromLogs } from "../lib/health/trends";
import { PETS } from "../constants/mockData";
import type { TimelineEntry } from "../types/pet";

const pet = { ...PETS[0], conditions: [], allergies: [], ageYears: 2 };
const today = "2026-11-19";
const entry = (category: TimelineEntry["category"], value: number, date = today): TimelineEntry => ({ id: `${category}-${date}`, petId: pet.id, category, title: `${category} log`, value, date, time: "12:00" });
const empty = computeHealthScore(pet, [], { weight: [40,40], activity: [8,8] }, today);
assert.equal(empty.overall, null, "Synthetic trends must not create a score");
assert.equal(empty.loggedSignals, 0);
assert.ok(empty.systems.every(s => !s.hasData), "Profile age must not appear as logged evidence");
assert.equal(computeHealthScore(pet, [entry("activity", 8)], undefined, today).overall, null);
const real = [entry("activity", 8), entry("stool", 3)];
const explained = computeHealthScore(pet, real, undefined, today);
assert.equal(explained.inputs.reduce((sum, input) => sum + input.contribution, 0), explained.overall);
assert.equal(explained.inputs.reduce((sum, input) => sum + input.weight, 0), 1);
assert.equal(explained.coverage.activity, 1);
assert.equal(explained.coverage.symptoms, 1);
assert.equal(explained.confidence, "low");
assert.deepEqual(empty.inputs, []);
assert.equal(computeHealthScore(pet, real, undefined, today).loggedSignals, 2);
assert.notEqual(computeHealthScore(pet, real, undefined, today).overall, null);
assert.equal(computeHealthScore(pet, real.map(e => ({ ...e, date: "2020-01-01" })), undefined, today).overall, null);
assert.equal(computeHealthScore(pet, real.map(e => ({ ...e, date: "2099-01-01" })), undefined, today).overall, null);
assert.equal(computeHealthScore(pet, [], undefined).generatedAt, new Date().toISOString().slice(0,10));
assert.deepEqual(trendsFromLogs([]), { appetite: [], stool: [], itching: [], activity: [], weight: [] });
assert.deepEqual(trendsFromLogs([entry("weight", 42), entry("weight", 40, "2026-11-18")]).weight, [40,42]);
console.log("PASS health evidence: empty, synthetic, sparse, recent, stale, future, and chronological trends");

// Run the actual top-level initializer. React Native defines window even when
// there is no browser location, and an exception here precedes the UI boundary.
const layout = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
const initializer = layout.match(/\/\/ A shared link[\s\S]*?(?=SplashScreen\.preventAutoHideAsync)/)?.[0];
assert.ok(initializer?.includes("initSentry()"), "The root telemetry initializer is covered");

function startsTelemetry(platform: string, window: object) {
  let started = false;
  runInNewContext(initializer!, {
    Platform: { OS: platform },
    window,
    initSentry: () => { started = true; },
  });
  return started;
}
assert.equal(startsTelemetry("ios", {}), true);
assert.equal(startsTelemetry("android", {}), true);
assert.equal(startsTelemetry("web", { location: { pathname: "/today" } }), true);
assert.equal(startsTelemetry("web", { location: { pathname: "/vet-visit-share" } }), false);
assert.equal(startsTelemetry("web", { location: { pathname: "/beta/vet-visit-share/" } }), false);
console.log("PASS native startup without window.location and share-page telemetry protection");
