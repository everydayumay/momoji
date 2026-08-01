import type { FridgeItem, Member } from "@/types/firestore";
import type { Menu, RecommendRequest } from "@/types/recommend";

const CACHE_PREFIX = "momoji:rec:";

/**
 * 냉장고/가족 정보가 바뀌면 캐시를 무효화하기 위한 서명값.
 */
export function buildSignature(items: FridgeItem[], members: Member[]) {
  const fridge = items
    .map((i) => `${i.name}:${i.amount}`)
    .sort()
    .join("|");
  const family = members
    .map(
      (m) =>
        `${m.name}:${m.healthNotes ?? ""}:${(m.preferences ?? []).join(",")}:${(
          m.mealTimes ?? []
        ).join(",")}`
    )
    .sort()
    .join("|");
  return `${fridge}#${family}`;
}

function cacheKey(dateKey: string, slot: string) {
  return `${CACHE_PREFIX}${dateKey}:${slot}`;
}

export function readCache(
  dateKey: string,
  slot: string,
  signature: string
): Menu[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(dateKey, slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { signature: string; menus: Menu[] };
    if (parsed.signature !== signature) return null;
    return Array.isArray(parsed.menus) && parsed.menus.length > 0
      ? parsed.menus
      : null;
  } catch {
    return null;
  }
}

export function writeCache(
  dateKey: string,
  slot: string,
  signature: string,
  menus: Menu[]
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      cacheKey(dateKey, slot),
      JSON.stringify({ signature, menus })
    );
  } catch {
    // localStorage 사용 불가(용량 초과/사파리 프라이빗 등) 시 무시
  }
}

/** 오늘이 아닌 날짜의 추천 캐시를 정리 */
export function pruneCache(todayKey: string) {
  if (typeof window === "undefined") return;
  try {
    const stale: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(CACHE_PREFIX)) continue;
      if (!key.startsWith(`${CACHE_PREFIX}${todayKey}:`)) stale.push(key);
    }
    stale.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // 무시
  }
}

export async function fetchRecommendation(
  body: RecommendRequest
): Promise<Menu[]> {
  const res = await fetch("/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    throw new Error(data?.error || "추천을 가져오지 못했습니다");
  }
  return Array.isArray(data.menus) ? (data.menus as Menu[]) : [];
}

export function toIngredients(items: FridgeItem[]) {
  return items.map((i) => ({ name: i.name, amount: i.amount }));
}

export function toMembers(members: Member[]) {
  return members.map((m) => ({
    name: m.name,
    healthNotes: m.healthNotes,
    mealTimes: m.mealTimes,
    preferences: m.preferences,
  }));
}

/**
 * 가족 구성원의 mealTimes에서 해당 끼니의 시간대를 추출.
 * 예: ["아점 11:00", "저녁 18:30"] + ["아점"] → "11:00"
 */
export function deriveTimeRange(
  members: Member[],
  keywords: readonly string[],
  fallback: string
) {
  const times = members
    .flatMap((m) => m.mealTimes ?? [])
    .filter((t) => keywords.some((k) => t.includes(k)))
    .map((t) => t.match(/\d{1,2}:\d{2}/)?.[0])
    .filter((t): t is string => Boolean(t));

  const unique = [...new Set(times)].sort();
  if (unique.length === 0) return fallback;
  if (unique.length === 1) return unique[0];
  return `${unique[0]} – ${unique[unique.length - 1]}`;
}
