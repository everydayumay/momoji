"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestore-schema";
import { FridgeItem } from "@/types/firestore";

interface Menu {
  name: string;
  description: string;
  cookTime: string;
  usedIngredients: string[];
  steps: string[];
}

type FridgeItemWithId = FridgeItem & { id: string };

export default function MealsPage() {
  const [fridgeItems, setFridgeItems] = useState<FridgeItemWithId[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.FRIDGE), (snap) => {
      setFridgeItems(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as FridgeItemWithId))
      );
    });
    return unsub;
  }, []);

  const handleRecommend = async () => {
    if (fridgeItems.length === 0) {
      setError("냉장고에 재료를 먼저 추가해주세요");
      return;
    }
    setLoading(true);
    setError(null);
    setMenus([]);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ingredients: fridgeItems }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "추천 실패");
      } else {
        setMenus(data.menus || []);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const menuEmojis = ["🍜", "🥘", "🍳"];

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">오늘 뭐 먹지?</h1>
      <p className="text-xs text-gray-400 mb-5">냉장고 재료로 메뉴를 추천해드려요</p>

      {/* Fridge summary */}
      {fridgeItems.length > 0 && (
        <div className="bg-orange-50 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-xl">🧊</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-orange-700">냉장고 재료 {fridgeItems.length}개</p>
            <p className="text-xs text-orange-500 truncate mt-0.5">
              {fridgeItems.slice(0, 5).map((i) => i.name).join(", ")}
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
            className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto"
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

            <div className="px-6 pb-10">
              <button
                onClick={() => setSelectedMenu(null)}
                className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-600 text-sm font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
