"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestore-schema";
import type { FridgeItem, Member } from "@/types/firestore";
import { formatKoreanDate, kstDateKey } from "@/lib/today";
import {
  buildSignature,
  deriveTimeRange,
  fetchRecommendation,
  pruneCache,
  readCache,
  toIngredients,
  toMembers,
  writeCache,
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

export default function HomePage() {
  const [dateStr, setDateStr] = useState("");
  const [dateKey, setDateKey] = useState("");
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [fridgeLoaded, setFridgeLoaded] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});

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
    if (dateKey) pruneCache(dateKey);
  }, [dateKey]);

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

  const signature = useMemo(
    () => buildSignature(fridgeItems, members),
    [fridgeItems, members]
  );

  const loadSlot = useCallback(
    async (slotKey: string, force: boolean) => {
      if (!dateKey || fridgeItems.length === 0) return;

      if (!force) {
        const cached = readCache(dateKey, slotKey, signature);
        if (cached) {
          setSlots((s) => ({
            ...s,
            [slotKey]: { status: "ready", menus: cached, error: null },
          }));
          return;
        }
      }

      setSlots((s) => ({
        ...s,
        [slotKey]: { status: "loading", menus: [], error: null },
      }));

      try {
        const menus = await fetchRecommendation({
          ingredients: toIngredients(fridgeItems),
          members: toMembers(members),
          mealType: slotKey,
          count: 2,
        });
        if (menus.length === 0) throw new Error("추천 결과가 비어 있습니다");
        writeCache(dateKey, slotKey, signature, menus);
        setSlots((s) => ({
          ...s,
          [slotKey]: { status: "ready", menus, error: null },
        }));
      } catch (err) {
        setSlots((s) => ({
          ...s,
          [slotKey]: {
            status: "error",
            menus: [],
            error: err instanceof Error ? err.message : "추천 실패",
          },
        }));
      }
    },
    [dateKey, fridgeItems, members, signature]
  );

  // 데이터가 준비되면 자동으로 한 번 추천 (같은 조건이면 재호출 안 함)
  const autoRunToken = useRef("");
  useEffect(() => {
    if (!dateKey || !fridgeLoaded || !membersLoaded) return;
    if (fridgeItems.length === 0) return;

    const token = `${dateKey}#${signature}`;
    if (autoRunToken.current === token) return;
    autoRunToken.current = token;

    SLOTS.forEach((slot) => loadSlot(slot.key, false));
  }, [
    dateKey,
    fridgeLoaded,
    membersLoaded,
    fridgeItems.length,
    signature,
    loadSlot,
  ]);

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
        {SLOTS.map((slot) => (
          <MealRecommendationCard
            key={slot.key}
            label={slot.key}
            emoji={slot.emoji}
            timeRange={deriveTimeRange(members, slot.keywords, slot.fallback)}
            state={slots[slot.key] ?? EMPTY_SLOT}
            hasIngredients={hasIngredients}
            onRefresh={() => loadSlot(slot.key, true)}
          />
        ))}
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
