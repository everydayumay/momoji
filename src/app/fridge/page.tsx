"use client";

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestore-schema";
import { FridgeItem } from "@/types/firestore";

const CATEGORIES = ["채소", "육류", "해산물", "유제품", "조미료", "기타"];

const CATEGORY_EMOJI: Record<string, string> = {
  채소: "🥬",
  육류: "🥩",
  해산물: "🐟",
  유제품: "🥛",
  조미료: "🧂",
  기타: "📦",
};

type FridgeItemWithId = FridgeItem & { id: string };

export default function FridgePage() {
  const [items, setItems] = useState<FridgeItemWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FridgeItemWithId | null>(null);
  const [form, setForm] = useState({ name: "", amount: "1", category: "채소" });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.FRIDGE), (snap) => {
      setItems(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as FridgeItemWithId))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", amount: "1", category: "채소" });
    setShowModal(true);
  };

  const openEdit = (item: FridgeItemWithId) => {
    setEditing(item);
    setForm({
      name: item.name,
      amount: String(item.amount),
      category: item.category,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        amount: Number(form.amount) || 1,
        category: form.category,
        updatedAt: Timestamp.now(),
      };
      if (editing) {
        await updateDoc(doc(db, COLLECTIONS.FRIDGE, editing.id), data);
      } else {
        await addDoc(collection(db, COLLECTIONS.FRIDGE), data);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.FRIDGE, id));
    setDeleteConfirm(null);
  };

  const grouped: [string, FridgeItemWithId[]][] = CATEGORIES.reduce(
    (acc, cat) => {
      const catItems = items.filter((i) => i.category === cat);
      if (catItems.length > 0) acc.push([cat, catItems]);
      return acc;
    },
    [] as [string, FridgeItemWithId[]][]
  );

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">냉장고</h1>
          {items.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">재료 {items.length}개</p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="bg-orange-500 text-white text-sm px-4 py-2 rounded-full font-medium shadow-sm"
        >
          + 재료 추가
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-2xl mb-2">⏳</p>
          <p className="text-sm">불러오는 중...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">🧊</p>
          <p className="text-sm font-medium text-gray-500">냉장고가 비어 있습니다</p>
          <p className="text-xs mt-1">재료를 추가해서 맞춤 메뉴 추천을 받아보세요</p>
          <button
            onClick={openAdd}
            className="mt-4 bg-orange-50 text-orange-500 text-sm px-5 py-2 rounded-full font-medium"
          >
            첫 재료 추가하기
          </button>
        </div>
      ) : (
        <div className="space-y-5 pb-4">
          {grouped.map(([cat, catItems]) => (
            <div key={cat}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{CATEGORY_EMOJI[cat]}</span>
                <span className="text-xs font-semibold text-gray-500">{cat}</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {catItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-4 py-3.5 ${
                      idx < catItems.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {item.amount}개
                      </span>
                    </div>
                    <div className="flex gap-3">
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal (bottom sheet) */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-gray-800 mb-5">
              {editing ? "재료 수정" : "재료 추가"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">재료명</label>
                <input
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="예: 당근"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">수량</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="1"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setForm((f) => ({ ...f, category: cat }))}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.category === cat
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-500 border-gray-200"
                      }`}
                    >
                      <span>{CATEGORY_EMOJI[cat]}</span>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-gray-800 text-center mb-1">재료를 삭제할까요?</p>
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
