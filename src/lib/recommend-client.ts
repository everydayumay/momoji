import { doc, onSnapshot, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, DEFAULT_FRIDGE_UNIT } from "@/lib/firestore-schema";
import type { FridgeItem, Member } from "@/types/firestore";
import type {
  DailyRecommendationDoc,
  Menu,
  RecommendRequest,
} from "@/types/recommend";

/**
 * 냉장고/가족 정보가 바뀌면 저장된 추천이 오래됐음을 알리기 위한 서명값.
 */
export function buildSignature(items: FridgeItem[], members: Member[]) {
  const fridge = items
    .map((i) => `${i.name}:${i.amount}${i.unit ?? DEFAULT_FRIDGE_UNIT}`)
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

function dailyDocRef(dateKey: string) {
  return doc(db, COLLECTIONS.DAILY_RECOMMENDATIONS, dateKey);
}

/**
 * 오늘의 추천 문서를 실시간 구독한다.
 * 아내가 갱신하면 남편 폰에도 바로 반영된다.
 */
export function subscribeDailyRecommendation(
  dateKey: string,
  onChange: (doc: DailyRecommendationDoc | null) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    dailyDocRef(dateKey),
    (snap) =>
      onChange(snap.exists() ? (snap.data() as DailyRecommendationDoc) : null),
    (err) => {
      console.error("dailyRecommendation subscribe error:", err);
      onError?.(err);
      onChange(null);
    }
  );
}

/** 끼니 하나의 추천을 공유 문서에 저장 (merge라 다른 끼니는 보존) */
export async function saveSlotRecommendation(params: {
  dateKey: string;
  slot: string;
  menus: Menu[];
  signature: string;
  updatedBy?: string | null;
}) {
  const { dateKey, slot, menus, signature, updatedBy } = params;
  await setDoc(
    dailyDocRef(dateKey),
    {
      date: dateKey,
      slots: {
        [slot]: {
          menus,
          signature,
          updatedAt: Timestamp.now(),
          updatedBy: updatedBy ?? null,
        },
      },
    },
    { merge: true }
  );
}

/** 이전 버전에서 쓰던 localStorage 캐시 정리 (한 번만 실행되면 충분) */
export function clearLegacyLocalCache() {
  if (typeof window === "undefined") return;
  try {
    const stale: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("momoji:rec:")) stale.push(key);
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
  return items.map((i) => ({
    name: i.name,
    amount: i.amount,
    unit: i.unit ?? DEFAULT_FRIDGE_UNIT,
  }));
}

export function toMembers(members: Member[]) {
  return members.map((m) => ({
    name: m.name,
    healthNotes: m.healthNotes,
    mealTimes: m.mealTimes,
    preferences: m.preferences,
  }));
}

/** "3개", "300g" 처럼 수량+단위를 붙여서 표시 */
export function formatAmount(item: Pick<FridgeItem, "amount" | "unit">) {
  return `${item.amount}${item.unit ?? DEFAULT_FRIDGE_UNIT}`;
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
