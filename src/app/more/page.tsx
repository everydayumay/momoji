"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function MorePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">더보기</h1>

      {user && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5 flex items-center gap-3">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName || "profile"}
              className="w-11 h-11 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold">
              {(user.displayName || "?").slice(0, 1)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
          >
            로그아웃
          </button>
        </div>
      )}

      <div className="space-y-3">
        <MenuRow label="가족 설정" icon="👨‍👩‍👧‍👦" href="/more/family" />
        <MenuRow label="근처 식당" icon="🏪" href="/more/restaurants" />
        <MenuRow label="배달 브랜드" icon="🛵" href="/more/delivery" />
        <MenuRow label="월별 통계" icon="📊" />
        <MenuRow label="알림 설정" icon="🔔" />
      </div>
    </div>
  );
}

function MenuRow({
  label,
  icon,
  href,
}: {
  label: string;
  icon: string;
  href?: string;
}) {
  const content = (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between ${
        href ? "active:bg-gray-50" : "opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      {href ? (
        <span className="text-gray-300 text-lg">›</span>
      ) : (
        <span className="text-xs text-gray-300">준비 중</span>
      )}
    </div>
  );

  if (!href) return content;

  return <Link href={href}>{content}</Link>;
}
