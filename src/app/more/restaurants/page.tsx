"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestore-schema";
import { Restaurant } from "@/types/firestore";

type RestaurantWithId = Restaurant & { id: string };

export default function RestaurantsPage() {
  const [items, setItems] = useState<RestaurantWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RestaurantWithId | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    openHours: "",
    distanceMin: "5",
    avgCost: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.RESTAURANTS), (snap) => {
      setItems(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as RestaurantWithId))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      category: "",
      openHours: "",
      distanceMin: "5",
      avgCost: "",
      notes: "",
    });
    setShowModal(true);
  };

  const openEdit = (item: RestaurantWithId) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      openHours: item.openHours,
      distanceMin: String(item.distanceMin ?? "5"),
      avgCost: String(item.avgCost ?? ""),
      notes: item.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        category: form.category.trim(),
        openHours: form.openHours.trim(),
        distanceMin: Number(form.distanceMin) || 0,
        avgCost: Number(form.avgCost) || 0,
        notes: form.notes.trim(),
      };
      if (editing) {
        await updateDoc(doc(db, COLLECTIONS.RESTAURANTS, editing.id), data);
      } else {
        await addDoc(collection(db, COLLECTIONS.RESTAURANTS), data);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.RESTAURANTS, id));
    setDeleteConfirm(null);
  };

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href="/more" className="text-gray-400 text-lg leading-none">
            ‹
          </Link>
          <h1 className="text-xl font-bold text-gray-800">근처 식당</h1>
        </div>
        <button
          onClick={openAdd}
          className="bg-orange-500 text-white text-sm px-4 py-2 rounded-full font-medium shadow-sm"
        >
          + 식당 추가
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-sm">불러오는 중...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">🏪</p>
          <p className="text-sm font-medium text-gray-500">등록된 식당이 없습니다</p>
          <p className="text-xs mt-1">자주 가는 식당을 등록해보세요</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                    {item.category && (
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.openHours && `${item.openHours} · `}
                    도보 {item.distanceMin}분
                    {item.avgCost ? ` · 평균 ${item.avgCost.toLocaleString()}원` : ""}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-1">{item.notes}</p>
                  )}
                </div>
                <div className="flex gap-3 flex-shrink-0 ml-2">
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
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-[390px] mx-auto p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-gray-800 mb-5">
              {editing ? "식당 수정" : "식당 추가"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">식당명</label>
                <input
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="예: 순두부찌개 전문점"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">카테고리</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="예: 한식"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">도보(분)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                    value={form.distanceMin}
                    onChange={(e) => setForm((f) => ({ ...f, distanceMin: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">영업시간</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="예: 11:00-21:00"
                    value={form.openHours}
                    onChange={(e) => setForm((f) => ({ ...f, openHours: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">평균 비용</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="예: 15000"
                    value={form.avgCost}
                    onChange={(e) => setForm((f) => ({ ...f, avgCost: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">메모</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="예: 임산부 맵기 조절 가능"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
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

      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-gray-800 text-center mb-1">
              식당을 삭제할까요?
            </p>
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
