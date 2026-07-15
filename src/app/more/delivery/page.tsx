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
import { DeliveryBrand } from "@/types/firestore";

type DeliveryBrandWithId = DeliveryBrand & { id: string };

export default function DeliveryBrandsPage() {
  const [items, setItems] = useState<DeliveryBrandWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DeliveryBrandWithId | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    avgCost: "",
    satisfactionScore: "3",
    activeCoupon: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTIONS.DELIVERY_BRANDS),
      (snap) => {
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as DeliveryBrandWithId))
        );
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", category: "", avgCost: "", satisfactionScore: "3", activeCoupon: false });
    setShowModal(true);
  };

  const openEdit = (item: DeliveryBrandWithId) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      avgCost: String(item.avgCost ?? ""),
      satisfactionScore: String(item.satisfactionScore ?? "3"),
      activeCoupon: !!item.activeCoupon,
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
        avgCost: Number(form.avgCost) || 0,
        satisfactionScore: Number(form.satisfactionScore) || 0,
        activeCoupon: form.activeCoupon,
      };
      if (editing) {
        await updateDoc(doc(db, COLLECTIONS.DELIVERY_BRANDS, editing.id), data);
      } else {
        await addDoc(collection(db, COLLECTIONS.DELIVERY_BRANDS), data);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.DELIVERY_BRANDS, id));
    setDeleteConfirm(null);
  };

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href="/more" className="text-gray-400 text-lg leading-none">
            ‹
          </Link>
          <h1 className="text-xl font-bold text-gray-800">배달 브랜드</h1>
        </div>
        <button
          onClick={openAdd}
          className="bg-orange-500 text-white text-sm px-4 py-2 rounded-full font-medium shadow-sm"
        >
          + 브랜드 추가
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-sm">불러오는 중...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
          <p className="text-4xl mb-3">🛵</p>
          <p className="text-sm font-medium text-gray-500">등록된 배달 브랜드가 없습니다</p>
          <p className="text-xs mt-1">자주 시키는 브랜드를 등록해보세요</p>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                    {item.category && (
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    )}
                    {item.activeCoupon && (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        쿠폰 있음
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.avgCost ? `평균 ${item.avgCost.toLocaleString()}원` : ""}
                    {item.satisfactionScore ? ` · 만족도 ${"⭐".repeat(item.satisfactionScore)}` : ""}
                  </p>
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
              {editing ? "브랜드 수정" : "브랜드 추가"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">브랜드명</label>
                <input
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="예: 배달의민족"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">카테고리</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="예: 분식"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">평균 비용</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                    placeholder="예: 20000"
                    value={form.avgCost}
                    onChange={(e) => setForm((f) => ({ ...f, avgCost: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">만족도</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setForm((f) => ({ ...f, satisfactionScore: String(n) }))
                      }
                      className={`w-9 h-9 rounded-full text-sm font-medium border transition-colors ${
                        Number(form.satisfactionScore) >= n
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-400 border-gray-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activeCoupon}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, activeCoupon: e.target.checked }))
                  }
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-600">사용 가능한 쿠폰 있음</span>
              </label>
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
              브랜드를 삭제할까요?
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
