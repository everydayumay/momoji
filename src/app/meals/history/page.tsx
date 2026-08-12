"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_EMOJI,
  COST_TYPE_LABELS,
  subscribeMealHistory,
  deleteMealHistory,
  type MealHistoryWithId,
} from "@/lib/meal-history";
import MealLogModal, { type MealLogInitial } from "@/components/MealLogModal";
import { kstDateKey } from "@/lib/today";

export default function MealHistoryPage() {
  const [items, setItems] = useState<MealHistoryWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MealHistoryWithId | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeMealHistory((data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, MealHistoryWithId[]>();
    for (const item of items) {
      const d = item.date?.toDate?.();
      if (!d) continue;
      const key = kstDateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (item: MealHistoryWithId) => {
    setEditing(item);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await deleteMealHistory(id);
    setDeleteConfirm(null);
  };

  const editInitial: MealLogInitial | null = editing
    ? {
        id: editing.id,
        menu: editing.menu,
        type: editing.type,
        mealType: editing.mealType,
        cost: editing.cost,
        date: editing.date?.toDate?.(),
      }
    : null;

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/" className="text-gray-400 text-lg leading-none">
          ‹
        </Link>
        <h1 className="text-xl font-bold text-gray-800">식비 기록</h1>
      </div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">{items.length > 0 ? `총 ${items.length}건` : ""}</p>
        <button
          onClick={openAdd}
          className="bg-orange-500 text-white text-sm px-4 py-2 rounded-full font-medium shadow-sm"
        >
          + 기록 추가
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-2xl mb-2">⏳</p>
          <p className="text-sm">불러오는 중...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm font-medium text-gray-500">기록된 식비가 없습니다</p>
          <p className="text-xs mt-1">추천받은 메뉴에서 &quot;이거 먹었어요&quot;를 눌러보세요</p>
        </div>
      ) : (
        <div className="space-y-5 pb-4">
          {grouped.map(([dateKey, dayItems]) => {
            const dayTotal = dayItems.reduce((s, i) => s + (i.cost || 0), 0);
            return (
              <div key={dateKey}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">
                    {formatGroupDate(dateKey)}
                  </span>
                  <span className="text-xs text-gray-400">{dayTotal.toLocaleString()}원</span>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {dayItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between px-4 py-3.5 ${
                        idx < dayItems.length - 1 ? "border-b border-gray-50" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{MEAL_TYPE_EMOJI[item.mealType]}</span>
                          <span className="font-medium text-gray-800 text-sm truncate">
                            {item.menu}
                          </span>
                        </div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {MEAL_TYPE_LABELS[item.mealType]}
                          </span>
                          <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {COST_TYPE_LABELS[item.type]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-sm font-semibold text-gray-700">
                          {(item.cost || 0).toLocaleString()}원
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-xs text-gray-400 hover:text-orange-500 transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MealLogModal open={showModal} onClose={() => setShowModal(false)} initial={editInitial} />

      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-gray-800 text-center mb-1">기록을 삭제할까요?</p>
            <p className="text-xs text-gray-400 text-center mb-5">삭제 후 복구할 수 없습니다</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatGroupDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}
