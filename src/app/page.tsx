"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, FAMILY_DOC_ID } from "@/lib/firestore-schema";
import type { FridgeItem, Member } from "@/types/firestore";
import { formatKoreanDate, kstDateKey } from "@/lib/today";
import { deriveTimeRange, fetchRecommendation, toIngredients, toMembers } from "@/lib/recommend-client";
import {
  getDayKey,
  getWeekKey,
  saveWeeklyPlanSlot,
  subscribeWeeklyPlan,
  type WeeklyMealType,
  type WeeklyPlanSlotWithId,
} from "@/lib/weekly-plan";
import { subscribeMealHistory, type MealHistoryWithId } from "@/lib/meal-history";
import HomeMealSlotCard from "@/components/HomeMealSlotCard";
import MealLogModal, { type MealLogInitial } from "@/components/MealLogModal";

const SLOTS = [
  {
    key: "아점",
    emoji: "🌤",
    keywords: ["아점", "브런치", "아침", "점심"],
    fallback: "11:00 – 13:00",
    mealType: "lunch",
  },
  {
    key: "저녁",
    emoji: "🌙",
    keywords: ["저녁", "석식"],
    fallback: "18:00 – 20:00",
    mealType: "dinner",
  },
] as const satisfies readonly { key: string; emoji: string; keywords: readonly string[]; fallback: string; mealType: WeeklyMealType }[];

export default function HomePage() {
  // KST "오늘"은 마운트 후에만 확정 (빌드타임/서버 고정 방지)
  const [baseDate, setBaseDate] = useState<Date | null>(null);
  const [dateStr, setDateStr] = useState("");

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);

  const [weeklySlots, setWeeklySlots] = useState<Record<string, WeeklyPlanSlotWithId>>({});
  const [loadingSlot, setLoadingSlot] = useState<Partial<Record<WeeklyMealType, boolean>>>({});
  const [slotError, setSlotError] = useState<Partial<Record<WeeklyMealType, string | null>>>({});

  const [mealHistory, setMealHistory] = useState<MealHistoryWithId[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logInitial, setLogInitial] = useState<MealLogInitial | null>(null);

  useEffect(() => {
    const sync = () => {
      const now = new Date();
      setBaseDate(now);
      setDateStr(formatKoreanDate(now));
    };
    sync();
    const timer = setInterval(sync, 60_000); // 자정 넘어가면 자동 갱신
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.FRIDGE), (snap) => {
      setFridgeItems(snap.docs.map((d) => d.data() as FridgeItem));
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

  // 식비 기록 (이번 달 합계 계산용)
  useEffect(() => {
    const unsub = subscribeMealHistory(setMealHistory);
    return unsub;
  }, []);

  // 월 예산 (families/main 문서)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, COLLECTIONS.FAMILIES, FAMILY_DOC_ID), (snap) => {
      const data = snap.data();
      setMonthlyBudget(typeof data?.monthlyBudget === "number" ? data.monthlyBudget : null);
    });
    return unsub;
  }, []);

  const weekKey = baseDate ? getWeekKey(baseDate) : "";
  const todayDay = baseDate ? getDayKey(baseDate) : null;
  const dateKey = baseDate ? kstDateKey(baseDate) : "";

  // 오늘이 속한 주의 weeklyPlan 슬롯 구독 (주간 그리드와 항상 같은 데이터를 본다)
  useEffect(() => {
    if (!weekKey) return;
    const unsub = subscribeWeeklyPlan(weekKey, setWeeklySlots);
    return unsub;
  }, [weekKey]);

  const monthlySpent = useMemo(() => {
    if (!dateKey) return 0;
    const monthPrefix = dateKey.slice(0, 7); // "YYYY-MM"
    return mealHistory
      .filter((item) => {
        const d = item.date?.toDate?.();
        return d ? kstDateKey(d).startsWith(monthPrefix) : false;
      })
      .reduce((sum, item) => sum + (item.cost || 0), 0);
  }, [mealHistory, dateKey]);

  const budgetPct =
    monthlyBudget && monthlyBudget > 0
      ? Math.min(100, Math.round((monthlySpent / monthlyBudget) * 100))
      : 0;

  const handleRecommend = useCallback(
    async (mealType: WeeklyMealType, label: string) => {
      if (!weekKey || !todayDay) return;
      if (fridgeItems.length === 0) {
        setSlotError((s) => ({ ...s, [mealType]: "냉장고에 재료를 먼저 추가해주세요" }));
        return;
      }
      setLoadingSlot((s) => ({ ...s, [mealType]: true }));
      setSlotError((s) => ({ ...s, [mealType]: null }));
      try {
        const menus = await fetchRecommendation({
          ingredients: toIngredients(fridgeItems),
          members: toMembers(members),
          mealType: label,
          count: 1,
        });
        const menu = menus[0];
        if (!menu) throw new Error("추천 결과가 비어 있습니다");

        // weeklyPlan에 저장 → 이 화면과 주간 그리드가 항상 동기화된다
        await saveWeeklyPlanSlot({
          weekKey,
          day: todayDay,
          mealType,
          menu: menu.name,
          source: "ai",
          menuDetail: menu,
        });
      } catch (err) {
        setSlotError((s) => ({
          ...s,
          [mealType]: err instanceof Error ? err.message : "추천 실패",
        }));
      } finally {
        setLoadingSlot((s) => ({ ...s, [mealType]: false }));
      }
    },
    [weekKey, todayDay, fridgeItems, members]
  );

  const openLogModal = useCallback((menu: string, mealType: WeeklyMealType) => {
    setLogInitial({ menu, type: "home", mealType });
    setShowLogModal(true);
  }, []);

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

      {/* Meal Slots (오늘의 weeklyPlan) */}
      <div className="space-y-4 mb-6">
        {SLOTS.map((slot) => {
          const cellId = todayDay ? `${todayDay}-${slot.mealType}` : "";
          const cell = cellId ? weeklySlots[cellId] ?? null : null;
          return (
            <HomeMealSlotCard
              key={slot.key}
              label={slot.key}
              emoji={slot.emoji}
              timeRange={deriveTimeRange(members, slot.keywords, slot.fallback)}
              slot={cell}
              loading={!!loadingSlot[slot.mealType]}
              error={slotError[slot.mealType] ?? null}
              hasIngredients={hasIngredients}
              onRecommend={() => handleRecommend(slot.mealType, slot.key)}
              onLogMeal={(menu) => openLogModal(menu, slot.mealType)}
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
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-400">이번 달 식비</p>
          <Link href="/meals/history" className="text-xs text-orange-500 font-medium">
            기록 보기 ›
          </Link>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-gray-800">
            {monthlySpent.toLocaleString()}원
          </span>
          <span className="text-sm text-gray-400 mb-1">
            {monthlyBudget ? `/ ${monthlyBudget.toLocaleString()}원` : "/ 예산 미설정"}
          </span>
        </div>
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-orange-400 rounded-full transition-all"
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        {!monthlyBudget && (
          <Link
            href="/more/family"
            className="inline-block mt-2 text-xs text-orange-500 font-medium"
          >
            예산 설정하러 가기 ›
          </Link>
        )}
      </div>

      <MealLogModal
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        initial={logInitial}
      />
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
