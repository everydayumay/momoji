"use client";

import { useState } from "react";
import {
  WEEK_DAY_LABELS,
  WEEKLY_SLOTS,
  saveWeeklyPlanSlot,
  deleteWeeklyPlanSlot,
  type WeekDay,
  type WeeklyMealType,
  type WeeklyPlanSlotWithId,
} from "@/lib/weekly-plan";
import { fetchRecommendation, toIngredients, toMembers } from "@/lib/recommend-client";
import type { FridgeItem, Member } from "@/types/firestore";
import type { Menu } from "@/types/recommend";

type Mode = "choose" | "manual" | "ai-loading" | "ai-result";

interface Props {
  weekKey: string;
  day: WeekDay;
  mealType: WeeklyMealType;
  current: WeeklyPlanSlotWithId | null;
  fridgeItems: FridgeItem[];
  members: Member[];
  onClose: () => void;
  onLogMeal: (menu: string, mealType: WeeklyMealType) => void;
}

export default function WeeklyPlanSlotSheet({
  weekKey,
  day,
  mealType,
  current,
  fridgeItems,
  members,
  onClose,
  onLogMeal,
}: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [manualInput, setManualInput] = useState("");
  const [aiOptions, setAiOptions] = useState<Menu[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const slotLabel = WEEKLY_SLOTS.find((s) => s.mealType === mealType)?.key ?? mealType;

  const handleManualSave = async () => {
    if (!manualInput.trim()) return;
    setSaving(true);
    try {
      await saveWeeklyPlanSlot({
        weekKey,
        day,
        mealType,
        menu: manualInput.trim(),
        source: "manual",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAiRecommend = async () => {
    if (fridgeItems.length === 0) {
      setAiError("냉장고에 재료를 먼저 추가해주세요");
      return;
    }
    setMode("ai-loading");
    setAiError(null);
    try {
      const menus = await fetchRecommendation({
        ingredients: toIngredients(fridgeItems),
        members: toMembers(members),
        mealType: slotLabel,
        count: 3,
      });
      setAiOptions(menus);
      setMode("ai-result");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "추천 실패");
      setMode("choose");
    }
  };

  const handlePickAiMenu = async (menu: Menu) => {
    setSaving(true);
    try {
      await saveWeeklyPlanSlot({
        weekKey,
        day,
        mealType,
        menu: menu.name,
        source: "ai",
        menuDetail: menu,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClearSlot = async () => {
    setSaving(true);
    try {
      await deleteWeeklyPlanSlot(weekKey, day, mealType);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-[390px] mx-auto p-6 pb-10 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-gray-800 mb-1">
          {WEEK_DAY_LABELS[day]}요일 {slotLabel}
        </h2>
        {current && <p className="text-xs text-gray-400 mb-4">현재: {current.menu}</p>}

        {mode === "choose" && (
          <div className="space-y-2 mt-2">
            <button
              onClick={() => setMode("manual")}
              className="w-full py-3 rounded-xl bg-gray-50 text-gray-700 text-sm font-medium text-left px-4"
            >
              ✏️ 직접 입력
            </button>
            <button
              onClick={handleAiRecommend}
              className="w-full py-3 rounded-xl bg-orange-50 text-orange-600 text-sm font-medium text-left px-4"
            >
              ✨ AI 추천 받기
            </button>
            {aiError && <p className="text-xs text-red-400 px-1">{aiError}</p>}

            {current && (
              <button
                onClick={() => onLogMeal(current.menu, mealType)}
                className="w-full py-3 rounded-xl bg-green-500 text-white text-sm font-medium"
              >
                ✅ 먹었어요
              </button>
            )}
            {current && (
              <button
                onClick={handleClearSlot}
                disabled={saving}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-400 text-sm font-medium disabled:opacity-50"
              >
                슬롯 비우기
              </button>
            )}
          </div>
        )}

        {mode === "manual" && (
          <div className="mt-2 space-y-3">
            <input
              autoFocus
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="예: 김치찌개"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
              onKeyDown={(e) => e.key === "Enter" && handleManualSave()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode("choose")}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium"
              >
                뒤로
              </button>
              <button
                onClick={handleManualSave}
                disabled={!manualInput.trim() || saving}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}

        {mode === "ai-loading" && (
          <div className="py-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full" />
            추천 만드는 중...
          </div>
        )}

        {mode === "ai-result" && (
          <div className="mt-2 space-y-2">
            {aiOptions.map((menu, i) => (
              <button
                key={i}
                onClick={() => handlePickAiMenu(menu)}
                disabled={saving}
                className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors disabled:opacity-50"
              >
                <p className="text-sm font-semibold text-gray-800">{menu.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {menu.description} · ⏱ {menu.cookTime}
                </p>
              </button>
            ))}
            <button
              onClick={() => setMode("choose")}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-medium mt-1"
            >
              다시 선택
            </button>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-4 py-2.5 text-gray-400 text-xs">
          닫기
        </button>
      </div>
    </div>
  );
}
