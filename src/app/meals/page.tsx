"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestore-schema";
import { FridgeItem, Member } from "@/types/firestore";
import type { Menu } from "@/types/recommend";
import { formatAmount, toIngredients, toMembers } from "@/lib/recommend-client";
import { guessMealType } from "@/lib/meal-history";
import MealLogModal, { type MealLogInitial } from "@/components/MealLogModal";
import WeeklyPlanGrid from "@/components/WeeklyPlanGrid";
import NutritionInfo from "@/components/NutritionInfo";

type FridgeItemWithId = FridgeItem & { id: string };

/** 탭을 옮겨도 추천 결과가 사라지지 않도록 보관 (앱을 닫으면 초기화) */
const SESSION_KEY = "pickup:meals:menus";

function readSessionMenus(): Menu[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as Menu[]) : [];
  } catch {
    return [];
  }
}

function writeSessionMenus(menus: Menu[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(menus));
  } catch {
    // 무시
  }
}

export default function MealsPage() {
  const [fridgeItems, setFridgeItems] = useState<FridgeItemWithId[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logInitial, setLogInitial] = useState<MealLogInitial | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.FRIDGE), (snap) => {
      setFridgeItems(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as FridgeItemWithId))
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.MEMBERS), (snap) => {
      setMembers(snap.docs.map((d) => d.data() as Member));
    });
    return unsub;
  }, []);

  // 이전에 받아둔 추천 복원 (다른 탭 갔다 와도 유지).
  // sessionStorage는 서버에 없으므로 useState 초기값으로 읽으면 하이드레이션이 깨진다.
  // 마운트 후 한 번만 동기화하는 것이 맞아서 규칙을 의도적으로 끈다.
  useEffect(() => {
    const saved = readSessionMenus();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved.length > 0) setMenus(saved);
  }, []);

  const handleRecommend = async () => {
    if (fridgeItems.length === 0) {
      setError("냉장고에 재료를 먼저 추가해주세요");
      return;
    }
    setLoading(true);
    setError(null);
    setMenus([]);
    writeSessionMenus([]);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ingredients: toIngredients(fridgeItems),
          members: toMembers(members),
          count: 3,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "추천 실패");
      } else {
        const next: Menu[] = data.menus || [];
        setMenus(next);
        writeSessionMenus(next);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const menuEmojis = ["🍜", "🥘", "🍳"];

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-800">오늘 뭐 먹지?</h1>
        <Link href="/meals/history" className="text-xs text-orange-500 font-medium">
          식비 기록 ›
        </Link>
      </div>
      <p className="text-xs text-gray-400 mb-5">이번 주 식단을 계획하고, 필요하면 바로 추천도 받아보세요</p>

      {/* Weekly plan grid */}
      <WeeklyPlanGrid
        fridgeItems={fridgeItems}
        members={members}
        onLogMeal={(menu, mealType) => {
          setLogInitial({ menu, type: "home", mealType });
          setShowLogModal(true);
        }}
      />

      <div className="border-t border-gray-100 pt-5 mb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          지금 바로 추천받기
        </p>
      </div>

      {/* Fridge summary */}
      {fridgeItems.length > 0 && (
        <div className="bg-orange-50 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-xl">🧊</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-orange-700">냉장고 재료 {fridgeItems.length}개</p>
            <p className="text-xs text-orange-500 truncate mt-0.5">
              {fridgeItems
                .slice(0, 5)
                .map((i) => `${i.name} ${formatAmount(i)}`)
                .join(", ")}
              {fridgeItems.length > 5 && ` 외 ${fridgeItems.length - 5}개`}
            </p>
          </div>
        </div>
      )}

      {/* Recommend button */}
      <button
        onClick={handleRecommend}
        disabled={loading}
        className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-medium text-sm shadow-sm disabled:opacity-60 mb-5 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            메뉴 추천 중...
          </>
        ) : (
          <>
            ✨ 오늘의 메뉴 추천받기
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-500 text-xs px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* Menu cards */}
      {menus.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">추천 메뉴</p>
          {menus.map((menu, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMenu(menu)}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:border-orange-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{menuEmojis[idx] || "🍽️"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-sm">{menu.name}</h3>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      ⏱ {menu.cookTime}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{menu.description}</p>
                  <NutritionInfo data={menu} compact />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {menu.usedIngredients.slice(0, 4).map((ing, i) => (
                      <span
                        key={i}
                        className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
                      >
                        {ing}
                      </span>
                    ))}
                    {menu.usedIngredients.length > 4 && (
                      <span className="text-xs text-gray-400 px-1">
                        +{menu.usedIngredients.length - 4}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-gray-300 text-sm mt-1">›</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state (no menus yet) */}
      {!loading && menus.length === 0 && !error && (
        <div className="bg-white rounded-2xl p-6 text-center text-gray-400 shadow-sm border border-gray-100">
          <p className="text-3xl mb-2">🍽️</p>
          <p className="text-sm">버튼을 눌러 오늘의 메뉴를 추천받아보세요</p>
          {fridgeItems.length === 0 && (
            <p className="text-xs mt-1 text-orange-400">냉장고 탭에서 재료를 먼저 추가하세요</p>
          )}
        </div>
      )}

      {/* Recipe Modal (bottom sheet) */}
      {selectedMenu && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end z-50"
          onClick={() => setSelectedMenu(null)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-[390px] mx-auto max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-white pt-4 pb-3 px-6 border-b border-gray-50">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedMenu.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedMenu.description}</p>
                </div>
                <button
                  onClick={() => setSelectedMenu(null)}
                  className="text-gray-400 text-xl leading-none mt-1"
                >
                  ×
                </button>
              </div>
              <div className="flex gap-3 mt-3">
                <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full">
                  ⏱ {selectedMenu.cookTime}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  재료 {selectedMenu.usedIngredients.length}가지
                </span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {selectedMenu.healthNote && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                  💚 {selectedMenu.healthNote}
                </p>
              )}

              <NutritionInfo data={selectedMenu} />

              {/* Ingredients */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                  필요한 재료
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMenu.usedIngredients.map((ing, i) => (
                    <span
                      key={i}
                      className="text-sm bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                  조리법
                </h3>
                <div className="space-y-3">
                  {selectedMenu.steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed flex-1 pt-0.5">
                        {step.replace(/^\d+\.\s*/, "")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-10 flex gap-2">
              <button
                onClick={() => setSelectedMenu(null)}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 text-sm font-medium"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setLogInitial({
                    menu: selectedMenu.name,
                    type: "home",
                    mealType: guessMealType(),
                  });
                  setSelectedMenu(null);
                  setShowLogModal(true);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-orange-500 text-white text-sm font-medium"
              >
                ✅ 이거 먹었어요
              </button>
            </div>
          </div>
        </div>
      )}

      <MealLogModal
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        initial={logInitial}
      />
    </div>
  );
}
