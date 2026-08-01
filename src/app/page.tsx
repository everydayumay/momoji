"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestore-schema";
import { useAuth } from "@/contexts/AuthContext";
import type { FridgeItem, Member } from "@/types/firestore";
import type { DailyRecommendationDoc } from "@/types/recommend";
import { formatKoreanDate, kstDateKey } from "@/lib/today";
import {
  buildSignature,
  clearLegacyLocalCache,
  deriveTimeRange,
  fetchRecommendation,
  saveSlotRecommendation,
  subscribeDailyRecommendation,
  toIngredients,
  toMembers,
} from "@/lib/recommend-client";
import MealRecommendationCard, {
  type SlotState,
} from "@/components/MealRecommendationCard";

const SLOTS = [
  {
    key: "아점",
    emoji: "🌤",
    keywords: ["아점", "브런치", "아침", "점심"],
    fallback: "11:00 – 13:00",
  },
  {
    key: "저녁",
    emoji: "🌙",
    keywords: ["저녁", "석식"],
    fallback: "18:00 – 20:00",
  },
] as const;

const EMPTY_SLOT: SlotState = { status: "idle", menus: [], error: null };

/** 이번 세션에서 방금 받아온 결과 / 진행 상태 */
type LocalSlot =
  | { status: "loading" }
  | { status: "ready"; menus: SlotState["menus"]; signature: string }
  | { status: "error"; error: string };

export default function HomePage() {
  const { user } = useAuth();

  const [dateStr, setDateStr] = useState("");
  const [dateKey, setDateKey] = useState("");
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [fridgeLoaded, setFridgeLoaded] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);

  const [shared, setShared] = useState<DailyRecommendationDoc | null>(null);
  const [sharedLoaded, setSharedLoaded] = useState(false);
  const [local, setLocal] = useState<Record<string, LocalSlot>>({});

  // 진행 중 슬롯을 effect 의존성 없이 추적
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    clearLegacyLocalCache();
  }, []);

  // 날짜: 클라이언트에서 KST 기준으로 계산 (빌드 타임 고정 방지)
  useEffect(() => {
    const sync = () => {
      const now = new Date();
      setDateStr(formatKoreanDate(now));
      setDateKey((prev) => {
        const next = kstDateKey(now);
        return prev === next ? prev : next;
      });
    };
    sync();
    const timer = setInterval(sync, 60_000); // 자정 넘어가면 자동 갱신
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.FRIDGE), (snap) => {
      setFridgeItems(snap.docs.map((d) => d.data() as FridgeItem));
      setFridgeLoaded(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.MEMBERS), (snap) => {
      setMembers(snap.docs.map((d) => d.data() as Member));
      setMembersLoaded(true);
    });
    return unsub;
  }, []);

  // 가족이 공유하는 오늘의 추천 문서 구독
  useEffect(() => {
    if (!dateKey) return;
    setSharedLoaded(false);
    setLocal({});
    const unsub = subscribeDailyRecommendation(dateKey, (docData) => {
      setShared(docData);
      setSharedLoaded(true);
    });
    return unsub;
  }, [dateKey]);

  const signature = useMemo(
    () => buildSignature(fridgeItems, members),
    [fridgeItems, members]
  );

  const loadSlot = useCallback(
    async (slotKey: string) => {
      if (!dateKey || fridgeItems.length === 0) return;
      if (inFlight.current.has(slotKey)) return;

      inFlight.current.add(slotKey);
      setLocal((s) => ({ ...s, [slotKey]: { status: "loading" } }));

      try {
        const menus = await fetchRecommendation({
          ingredients: toIngredients(fridgeItems),
          members: toMembers(members),
          mealType: slotKey,
          count: 2,
        });
        if (menus.length === 0) throw new Error("추천 결과가 비어 있습니다");

        setLocal((s) => ({
          ...s,
          [slotKey]: { status: "ready", menus, signature },
        }));

        // 저장 실패해도 화면에는 이미 결과가 떠 있으므로 막지 않는다
        try {
          await saveSlotRecommendation({
            dateKey,
            slot: slotKey,
            menus,
            signature,
            updatedBy: user?.displayName ?? null,
          });
        } catch (saveErr) {
          console.warn("추천 공유 저장 실패:", saveErr);
        }
      } catch (err) {
        setLocal((s) => ({
          ...s,
          [slotKey]: {
            status: "error",
            error: err instanceof Error ? err.message : "추천 실패",
          },
        }));
      } finally {
        inFlight.current.delete(slotKey);
      }
    },
    [dateKey, fridgeItems, members, signature, user]
  );

  // 오늘 저장된 추천이 아예 없을 때만 자동 호출 (있으면 가족 것을 그대로 씀)
  useEffect(() => {
    if (!dateKey || !sharedLoaded || !fridgeLoaded || !membersLoaded) return;
    if (fridgeItems.length === 0) return;

    SLOTS.forEach((slot) => {
      if (shared?.slots?.[slot.key]?.menus?.length) return;
      if (local[slot.key]) return;
      void loadSlot(slot.key);
    });
  }, [
    dateKey,
    sharedLoaded,
    fridgeLoaded,
    membersLoaded,
    fridgeItems.length,
    shared,
    local,
    loadSlot,
  ]);

  const viewFor = useCallback(
    (slotKey: string) => {
      const mine = local[slotKey];
      const saved = shared?.slots?.[slotKey];

      if (mine?.status === "loading") {
        return { state: { status: "loading", menus: [], error: null } as SlotState, notice: null, meta: null };
      }

      if (mine?.status === "ready") {
        return {
          state: { status: "ready", menus: mine.menus, error: null } as SlotState,
          notice:
            mine.signature !== signature
              ? "냉장고 재료가 바뀌었어요 · 다시 추천을 눌러보세요"
              : null,
          meta: null,
        };
      }

      if (saved?.menus?.length) {
        const stale = saved.signature !== signature;
        const failed = mine?.status === "error";
        return {
          state: { status: "ready", menus: saved.menus, error: null } as SlotState,
          notice: failed
            ? `갱신 실패 · ${mine.error}`
            : stale
              ? "냉장고 재료가 바뀌었어요 · 다시 추천을 눌러보세요"
              : null,
          meta: formatMeta(saved.updatedAt, saved.updatedBy),
        };
      }

      if (mine?.status === "error") {
        return {
          state: { status: "error", menus: [], error: mine.error } as SlotState,
          notice: null,
          meta: null,
        };
      }

      return { state: EMPTY_SLOT, notice: null, meta: null };
    },
    [local, shared, signature]
  );

  const hasIngredients = fridgeItems.length > 0;

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 min-h-[20px]">{dateStr}</p>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">
          오늘 뭐 먹을까요? 🍚
        </h1>
        {membersLoaded && members.length === 0 && (
          <Link
            href="/more/family"
            className="inline-block mt-2 text-xs text-orange-500 font-medium"
          >
            가족 정보를 설정하면 맞춤 추천이 시작돼요 ›
          </Link>
        )}
      </div>

      {/* Meal Recommendations */}
      <div className="space-y-4 mb-6">
        {SLOTS.map((slot) => {
          const view = viewFor(slot.key);
          return (
            <MealRecommendationCard
              key={slot.key}
              label={slot.key}
              emoji={slot.emoji}
              timeRange={deriveTimeRange(members, slot.keywords, slot.fallback)}
              state={view.state}
              notice={view.notice}
              meta={view.meta}
              hasIngredients={hasIngredients}
              onRefresh={() => loadSlot(slot.key)}
            />
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <QuickAction icon="🧊" label="냉장고 확인" href="/fridge" />
        <QuickAction icon="📅" label="이번 주 식단" href="/meals" />
        <QuickAction icon="🏪" label="근처 식당" href="/more/restaurants" />
        <QuickAction icon="🛵" label="배달 브랜드" href="/more/delivery" />
      </div>

      {/* Budget Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 mb-1">이번 달 식비</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-gray-800">–</span>
          <span className="text-sm text-gray-400 mb-1">/ 예산 미설정</span>
        </div>
        <div className="mt-2 h-2 bg-gray-100 rounded-full">
          <div className="h-2 bg-orange-400 rounded-full w-0" />
        </div>
      </div>
    </div>
  );
}

function formatMeta(
  updatedAt: { toDate: () => Date } | undefined,
  updatedBy: string | null | undefined
) {
  if (!updatedAt?.toDate) return null;
  try {
    const time = updatedAt.toDate().toLocaleTimeString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
    });
    return updatedBy ? `${time} · ${updatedBy}` : time;
  } catch {
    return null;
  }
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:bg-orange-50 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
}
