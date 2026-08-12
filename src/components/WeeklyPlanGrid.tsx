"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WEEK_DAY_LABELS,
  WEEKLY_SLOTS,
  getWeekDates,
  getWeekKey,
  formatWeekDateLabel,
  subscribeWeeklyPlan,
  type WeekDay,
  type WeeklyMealType,
  type WeeklyPlanSlotWithId,
} from "@/lib/weekly-plan";
import type { FridgeItem, Member } from "@/types/firestore";
import WeeklyPlanSlotSheet from "@/components/WeeklyPlanSlotSheet";

interface Props {
  fridgeItems: FridgeItem[];
  members: Member[];
  onLogMeal: (menu: string, mealType: WeeklyMealType) => void;
}

type WeekDateEntry = ReturnType<typeof getWeekDates>[number];

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function WeeklyPlanGrid({ fridgeItems, members, onLogMeal }: Props) {
  // KST "오늘"은 마운트 후에만 확정 (SSR/클라이언트 빌드타임 고정 방지, 홈 화면과 동일한 패턴)
  const [baseDate, setBaseDate] = useState<Date | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState<Record<string, WeeklyPlanSlotWithId>>({});
  const [loading, setLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<{ day: WeekDay; mealType: WeeklyMealType } | null>(
    null
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBaseDate(new Date());
  }, []);

  const weekAnchor = baseDate ? addDays(baseDate, weekOffset * 7) : null;
  const weekDates = useMemo(() => (weekAnchor ? getWeekDates(weekAnchor) : []), [weekAnchor]);
  const weekKey = useMemo(() => (weekAnchor ? getWeekKey(weekAnchor) : ""), [weekAnchor]);

  useEffect(() => {
    if (!weekKey) return;
    // 주(week)를 이동할 때마다 로딩 표시를 다시 켜는 의도된 동기화라 규칙을 끈다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsub = subscribeWeeklyPlan(weekKey, (map) => {
      setSlots(map);
      setLoading(false);
    });
    return unsub;
  }, [weekKey]);

  const activeCurrent = activeSlot ? slots[`${activeSlot.day}-${activeSlot.mealType}`] ?? null : null;

  const displayDates: (WeekDateEntry | null)[] =
    weekDates.length > 0 ? weekDates : Array.from({ length: 7 }, () => null);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-800">이번 주 식단</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="text-gray-400 text-sm px-1.5 disabled:opacity-30"
            disabled={!baseDate}
          >
            ‹
          </button>
          <span className="text-[11px] text-gray-400 min-w-[70px] text-center">
            {weekOffset === 0 ? "이번 주" : weekKey || " "}
          </span>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="text-gray-400 text-sm px-1.5 disabled:opacity-30"
            disabled={!baseDate}
          >
            ›
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 pb-1">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-7 gap-1.5">
            {displayDates.map((wd, i) => (
              <div key={wd ? wd.day : i} className="text-center">
                <p className="text-[11px] font-semibold text-gray-500">
                  {wd ? WEEK_DAY_LABELS[wd.day] : " "}
                </p>
                <p className="text-[10px] text-gray-300">{wd ? formatWeekDateLabel(wd) : " "}</p>
              </div>
            ))}
          </div>

          {WEEKLY_SLOTS.map((slot) => (
            <div key={slot.mealType} className="grid grid-cols-7 gap-1.5 mt-1.5">
              {displayDates.map((wd, i) => {
                if (!wd) {
                  return <div key={i} className="h-16 rounded-xl bg-gray-50" />;
                }
                const cellId = `${wd.day}-${slot.mealType}`;
                const cell = slots[cellId];
                return (
                  <button
                    key={cellId}
                    onClick={() => setActiveSlot({ day: wd.day, mealType: slot.mealType })}
                    className={`h-16 rounded-xl px-1.5 py-1.5 text-left flex flex-col justify-between border transition-colors ${
                      cell ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <span className="text-[9px] text-gray-400">{slot.key}</span>
                    <span
                      className={`text-[10px] font-medium leading-tight line-clamp-2 ${
                        cell ? "text-green-700" : "text-gray-300"
                      }`}
                    >
                      {cell ? cell.menu : "+ 추가"}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {loading && baseDate && (
        <p className="text-center text-xs text-gray-300 mt-2">불러오는 중...</p>
      )}

      {activeSlot && weekKey && (
        <WeeklyPlanSlotSheet
          weekKey={weekKey}
          day={activeSlot.day}
          mealType={activeSlot.mealType}
          current={activeCurrent}
          fridgeItems={fridgeItems}
          members={members}
          onClose={() => setActiveSlot(null)}
          onLogMeal={(menu, mealType) => {
            onLogMeal(menu, mealType);
            setActiveSlot(null);
          }}
        />
      )}
    </div>
  );
}
