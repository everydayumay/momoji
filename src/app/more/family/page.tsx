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
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestore-schema";
import { Member } from "@/types/firestore";

type MemberWithId = Member & { id: string };

const FAMILY_DOC_ID = "main";

export default function FamilySettingsPage() {
  const [members, setMembers] = useState<MemberWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MemberWithId | null>(null);
  const [form, setForm] = useState({
    name: "",
    healthNotes: "",
    mealTimes: "",
    preferences: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.MEMBERS), (snap) => {
      setMembers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as MemberWithId))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.FAMILIES, FAMILY_DOC_ID));
      if (snap.exists()) {
        const data = snap.data();
        if (data.monthlyBudget) setBudget(String(data.monthlyBudget));
      }
    })();
  }, []);

  const saveBudget = async () => {
    setBudgetSaving(true);
    try {
      await setDoc(
        doc(db, COLLECTIONS.FAMILIES, FAMILY_DOC_ID),
        { monthlyBudget: Number(budget) || 0 },
        { merge: true }
      );
    } finally {
      setBudgetSaving(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", healthNotes: "", mealTimes: "", preferences: "" });
    setShowModal(true);
  };

  const openEdit = (member: MemberWithId) => {
    setEditing(member);
    setForm({
      name: member.name,
      healthNotes: member.healthNotes || "",
      mealTimes: (member.mealTimes || []).join(", "),
      preferences: (member.preferences || []).join(", "),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        healthNotes: form.healthNotes.trim(),
        mealTimes: form.mealTimes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        preferences: form.preferences
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (editing) {
        await updateDoc(doc(db, COLLECTIONS.MEMBERS, editing.id), data);
      } else {
        await addDoc(collection(db, COLLECTIONS.MEMBERS), data);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.MEMBERS, id));
    setDeleteConfirm(null);
  };

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/more" className="text-gray-400 text-lg leading-none">
          ‹
        </Link>
        <h1 className="text-xl font-bold text-gray-800">가족 설정</h1>
      </div>

      {/* Monthly budget */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5">
        <p className="text-xs font-semibold text-gray-500 mb-2">이번 달 식비 예산</p>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="예: 800000"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
          />
          <button
            onClick={saveBudget}
            disabled={budgetSaving}
            className="bg-orange-500 text-white text-sm px-4 py-2.5 rounded-xl font-medium disabled:opacity-50"
          >
            {budgetSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500">가족 구성원</p>
        <button
          onClick={openAdd}
          className="bg-orange-500 text-white text-xs px-3.5 py-1.5 rounded-full font-medium shadow-sm"
        >
          + 구성원 추가
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-10">
          <p className="text-sm">불러오는 중...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
          <p className="text-3xl mb-2">👨‍👩‍👧‍👦</p>
          <p className="text-sm">등록된 가족 구성원이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{member.name}</p>
                  {member.healthNotes && (
                    <p className="text-xs text-gray-400 mt-1">{member.healthNotes}</p>
                  )}
                  {member.mealTimes?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.mealTimes.map((t, i) => (
                        <span
                          key={i}
                          className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {member.preferences?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {member.preferences.map((p, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 flex-shrink-0 ml-2">
                  <button
                    onClick={() => openEdit(member)}
                    className="text-xs text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(member.id)}
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

      {/* Add/Edit Modal */}
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
              {editing ? "구성원 수정" : "구성원 추가"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">이름</label>
                <input
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="예: 남편"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  건강 메모
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="예: 임신성 당뇨"
                  value={form.healthNotes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, healthNotes: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  식사 시간 (쉼표로 구분)
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="예: 아점 11:00, 저녁 18:30"
                  value={form.mealTimes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mealTimes: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  선호/취향 (쉼표로 구분)
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="예: 가성비, 아무거나 잘 먹음"
                  value={form.preferences}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, preferences: e.target.value }))
                  }
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

      {/* Delete Confirm */}
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
              구성원을 삭제할까요?
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
