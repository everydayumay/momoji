"use client";

import { useEffect, useState } from "react";
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  COST_TYPES,
  COST_TYPE_LABELS,
  addMealHistory,
  updateMealHistory,
  guessMealType,
  type MealHistoryInput,
} from "@/lib/meal-history";
import type { MealHistory } from "@/types/firestore";
import { kstDateKey } from "@/lib/today";

export interface MealLogInitial {
  id?: string;
  menu?: string;
  type?: MealHistory["type"];
  mealType?: MealHistory["mealType"];
  cost?: number;
  date?: Date;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: MealLogInitial | null;
  onSaved?: () => void;
}

export default function MealLogModal({ open, onClose, initial, onSaved }: Props) {
  const [dateValue, setDateValue] = useState(kstDateKey());
  const [mealType, setMealType] = useState<MealHistory["mealType"]>("dinner");
  const [menu, setMenu] = useState("");
  const [type, setType] = useState<MealHistory["type"]>("home");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // 모달이 열릴 때(또는 편집 대상이 바뀔 때)만 폼을 초기화하는 의도된 동기화라 규칙을 끈다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDateValue(initial?.date ? kstDateKey(initial.date) : kstDateKey());
    setMealType(initial?.mealType ?? guessMealType());
    setMenu(initial?.menu ?? "");
    setType(initial?.type ?? "home");
    setCost(initial?.cost != null ? String(initial.cost) : "");
  }, [open, initial]);

  if (!open) return null;

  const menuPrefilled = Boolean(initial?.menu);

  const handleSave = async () => {
    if (!menu.trim()) return;
    setSaving(true);
    try {
      const [y, m, d] = dateValue.split("-").map(Number);
      // 정오로 고정해서 타임존 경계에서 날짜가 밀리는 걸 방지
      const date = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
      const payload: MealHistoryInput = {
        date,
        mealType,
        menu: menu.trim(),
        type,
        cost: Number(cost) || 0,
      };
      if (initial?.id) {
        await updateMealHistory(initial.id, payload);
      } else {
        await addMealHistory(payload);
      }
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-[390px] mx-auto p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-gray-800 mb-5">
          {initial?.id ? "식비 기록 수정" : "이거 먹었어요"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">날짜</label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">끼니</label>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt}
                  onClick={() => setMealType(mt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    mealType === mt
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  {MEAL_TYPE_LABELS[mt]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">메뉴명</label>
            <input
              autoFocus={!menuPrefilled}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
              placeholder="예: 된장찌개"
              value={menu}
              onChange={(e) => setMenu(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">유형</label>
            <div className="flex gap-2">
              {COST_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    type === t
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  {COST_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">금액 (원)</label>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              autoFocus={menuPrefilled}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
              placeholder="예: 12000"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!menu.trim() || saving}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
