export default function MorePage() {
  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">더보기</h1>
      <div className="space-y-3">
        <MenuRow label="가족 설정" icon="👨‍👩‍👧‍👦" />
        <MenuRow label="근처 식당" icon="🏪" />
        <MenuRow label="배달 브랜드" icon="🛵" />
        <MenuRow label="월별 통계" icon="📊" />
        <MenuRow label="알림 설정" icon="🔔" />
      </div>
    </div>
  );
}

function MenuRow({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className="text-gray-300 text-lg">›</span>
    </div>
  );
}
