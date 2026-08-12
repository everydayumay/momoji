"use client";

import { useState } from "react";
import Link from "next/link";
import type { Menu } from "@/types/recommend";

export type SlotStatus = "idle" | "loading" | "ready" | "error";

export interface SlotState {
  status: SlotStatus;
  menus: Menu[];
  error: string | null;
}

interface Props {
  label: string;
  emoji: string;
  timeRange: string;
  state: SlotState;
  hasIngredients: boolean;
  onRefresh: () => void;
  /** "재료가 바뀌었어요" 같은 안내 문구 */
  notice?: string | null;
  /** "12:30 갱신" 처럼 누가 언제 갱신했는지 */
  meta?: string | null;
  /** 있으면 "이거 먹었어요" 버튼을 노출 */
  onLogMeal?: (menu: Menu) => void;
}

export default function MealRecommendationCard({
  label,
  emoji,
  timeRange,
  state,
  hasIngredients,
  onRefresh,
  notice,
  meta,
  onLogMeal,
}: Props) {
  const [showSteps, setShowSteps] = useState(false);
  const [altIndex, setAltIndex] = useState(0);

  const menu = state.menus[altIndex] ?? state.menus[0];
  const hasAlternative = state.menus.length > 1;

  const cycleAlternative = () => {
    setShowSteps(false);
    setAltIndex((i) => (i + 1) % state.menus.length);
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{emoji}</span>
          <span className="text-sm font-semibold text-orange-500">{label}</span>
          <span className="text-xs text-gray-400">{timeRange}</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={state.status === "loading" || !hasIngredients}
          className="text-xs bg-orange-50 text-orange-500 px-3 py-1 rounded-full font-medium disabled:opacity-40"
        >
          {state.status === "ready" ? "다시 추천" : "추천받기"}
        </button>
      </div>

      {notice && (
        <p className="mb-2.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
          {notice}
        </p>
      )}

      {!hasIngredients ? (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm">냉장고가 비어 있어요</p>
          <Link
            href="/fridge"
            className="inline-block mt-2 text-xs text-orange-500 font-medium"
          >
            재료 추가하러 가기 ›
          </Link>
        </div>
      ) : state.status === "loading" ? (
        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center gap-2">
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-orange-300 border-t-transparent rounded-full" />
          <p className="text-gray-400 text-sm">추천 만드는 중...</p>
        </div>
      ) : state.status === "error" ? (
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-red-400 text-xs">{state.error}</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-xs text-red-500 font-medium underline"
          >
            다시 시도
          </button>
        </div>
      ) : menu ? (
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-gray-800 text-base">{menu.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{menu.description}</p>
            </div>
            <span className="flex-shrink-0 text-xs text-gray-400 mt-1">
              ⏱ {menu.cookTime}
            </span>
          </div>

          {menu.healthNote ? (
            <p className="mt-2 text-xs text-green-600 bg-green-50 rounded-lg px-2.5 py-1.5">
              💚 {menu.healthNote}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1 mt-2.5">
            {menu.usedIngredients.slice(0, 5).map((ing, i) => (
              <span
                key={i}
                className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
              >
                {ing}
              </span>
            ))}
            {menu.usedIngredients.length > 5 && (
              <span className="text-xs text-gray-400 px-1">
                +{menu.usedIngredients.length - 5}
              </span>
            )}
          </div>

          {showSteps && menu.steps?.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-gray-50 pt-3">
              {menu.steps.map((step, i) => (
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
            <button
              onClick={() => setShowSteps((s) => !s)}
              className="flex-1 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-medium"
            >
              {showSteps ? "조리법 접기" : "조리법 보기"}
            </button>
            {hasAlternative && (
              <button
                onClick={cycleAlternative}
                className="flex-1 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-medium"
              >
                다른 메뉴 ({altIndex + 1}/{state.menus.length})
              </button>
            )}
          </div>

          {onLogMeal && (
            <button
              onClick={() => onLogMeal(menu)}
              className="w-full mt-2 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-medium"
            >
              ✅ 이거 먹었어요
            </button>
          )}

          {meta && (
            <p className="mt-2 text-[11px] text-gray-300 text-right">{meta}</p>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm">추천받기를 눌러주세요</p>
        </div>
      )}
    </div>
  );
}
