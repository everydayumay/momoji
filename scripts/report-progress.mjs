#!/usr/bin/env node
/**
 * Pick Up! (momoji) 프로젝트 진행률을 개인 Mission Control 대시보드에 보고한다.
 *
 * progress.json의 steps(done/미완료)를 읽어 percent/current/goal/nextAction을 계산하고,
 * 마지막 커밋 날짜(KST 기준)를 lastWorked로 채워 POST한다.
 *
 * 인증: DASHBOARD_TOKEN 또는 MISSION_CONTROL_TOKEN 환경변수가 있으면
 * Authorization: Bearer 헤더를 붙인다. 없으면 무인증으로 요청한다.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const progressPath = path.join(__dirname, "..", "progress.json");

const DASHBOARD_URL = "https://ai-dashboard-pink-iota.vercel.app/api/state";

function loadProgress() {
  const raw = readFileSync(progressPath, "utf-8");
  return JSON.parse(raw);
}

function lastWorkedDate() {
  try {
    return execSync("git log -1 --format=%cd --date=format-local:%Y-%m-%d", {
      env: { ...process.env, TZ: "Asia/Seoul" },
    })
      .toString()
      .trim();
  } catch {
    // git 정보를 못 가져오면 오늘 날짜(로컬 타임존)로 대체
    return new Date().toISOString().slice(0, 10);
  }
}

async function main() {
  const progress = loadProgress();
  const steps = Array.isArray(progress.steps) ? progress.steps : [];
  const done = steps.filter((s) => s.done).length;
  const total = steps.length || 1;
  const percent = Math.round((done / total) * 100);
  const next = steps.find((s) => !s.done);

  const body = {
    key: progress.key || "project:pickup",
    data: {
      name: progress.name || "Pick Up!",
      icon: progress.icon || "🍰",
      percent,
      current: done,
      goal: total,
      unit: progress.unit || "기능",
      nextAction: next ? next.text : "모든 계획된 기능 완료",
      lastWorked: lastWorkedDate(),
    },
  };

  const headers = { "Content-Type": "application/json" };
  const token = process.env.DASHBOARD_TOKEN || process.env.MISSION_CONTROL_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  console.log("Reporting progress to Mission Control:");
  console.log(JSON.stringify(body, null, 2));

  try {
    const res = await fetch(DASHBOARD_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`Dashboard report failed: ${res.status} ${text}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Dashboard report succeeded: ${res.status} ${text}`);
  } catch (err) {
    console.error("Dashboard report error:", err);
    process.exitCode = 1;
  }
}

main();
