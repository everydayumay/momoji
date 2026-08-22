"use client";

import { useState } from "react";
import Link from "next/link";
import NutritionInfo from "@/components/NutritionInfo";
import type { WeeklyPlanSlotWithId } from "@/lib/weekly-plan";

interface Props {
  label: string;
  emoji: string;
  timeRange: string;
  slot: WeeklyPlanSlotWithId | null;
  loading: boolean;
  error: string | null;
  hasIngredients: boolean;
  onRecommend: () => void;
  onLogMeal: (menu: string) => void;
}

export default function HomeMealSlotCard({
  label,
  emoji,
  timeRange,
  slot,
  loading,
  error,
  hasIngredients,
  onRecommend,
  onLogMeal,
}: Props) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{emoji}</span>
          <span className="text-sm font-semibold text-orange-500">{label}</span>
          <span className="text-xs text-gray-400">{timeRange}</span>
        </div>
        {slot && (
          <button
            onClick={onRecommend}
            disabled={loading || !hasIngredients}
            className="text-xs bg-orange-50 text-orange-500 px-3 py-1 rounded-full font-medium disabled:opacity-40"
          >
            다른 거 먹고 싶어요
          </button>
        )}
      </div>

      {!hasIngredients ? (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm">냉장고가 비어 있어요</p>
          <Link href="/fridge" className="inline-block mt-2 text-xs text-orange-500 font-medium">
            재료 추가하러 가기 ›
          </Link>
        </div>
      ) : loading ? (
        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center gap-2">
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-orange-300 border-t-transparent rounded-full" />
          <p className="text-gray-400 text-sm">추천 만드는 중...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-red-400 text-xs">{error}</p>
          <button onClick={onRecommend} className="mt-2 text-xs text-red-500 font-medium underline">
            다시 시도
          </button>
        </div>
      ) : slot ? (
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-gray-800 text-base">{slot.menu}</p>
              {slot.description && (
                <p className="text-xs text-gray-500 mt-0.5">{slot.description}</p>
              )}
            </div>
            {slot.cookTime && (
              <span className="flex-shrink-0 text-xs text-gray-400 mt-1">⏱ {slot.cookTime}</span>
            )}
          </div>

          {slot.healthNote && (
            <p className="mt-2 text-xs text-green-600 bg-green-50 rounded-lg px-2.5 py-1.5">
              💚 {slot.healthNote}
            </p>
          )}

          <NutritionInfo
            data={{
              calories: slot.calories,
              carbs: slot.carbs,
              protein: slot.protein,
              fat: slot.fat,
              giLevel: slot.giLevel,
            }}
          />

          {slot.usedIngredients && slot.usedIngredients.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {slot.usedIngredients.slice(0, 5).map((ing, i) => (
                <span
                  key={i}
                  className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
                >
                  {ing}
                </span>
              ))}
              {slot.usedIngredients.length > 5 && (
                <span className="text-xs text-gray-400 px-1">
                  +{slot.usedIngredients.length - 5}
                </span>
              )}
            </div>
          )}

          {showSteps && slot.steps && slot.steps.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-gray-50 pt-3">
              {slot.steps.map((step, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <p className="text-xs text-gray-700 leading-relaxed flex-1 pt-0.5">
                    {step.replace(/^\d+\.\s*/, "")}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            {slot.steps && slot.steps.length > 0 && (
              <button
                onClick={() => setShowSteps((s) => !s)}
                className="flex-1 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-medium"
              >
                {showSteps ? "조리법 접기" : "조리법 보기"}
              </button>
            )}
            <button
              onClick={() => onLogMeal(slot.menu)}
              className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-xs font-medium"
            >
              ✅ 이거 먹었어요
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm mb-3">아직 계획된 메뉴가 없어요</p>
          <button
            onClick={onRecommend}
            className="text-sm bg-orange-500 text-white px-4 py-2 rounded-full font-medium"
          >
            ✨ 추천받기
          </button>
        </div>
      )}
    </div>
  );
}
