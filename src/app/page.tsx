export default function HomePage() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-400">{dateStr}</p>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">
          오늘 뭐 먹을까요? 🍚
        </h1>
      </div>

      {/* Meal Recommendations */}
      <div className="space-y-4 mb-6">
        <MealCard
          type="아점"
          timeRange="11:00 – 13:00"
          placeholder="추천 준비 중..."
        />
        <MealCard
          type="저녁"
          timeRange="18:00 – 20:00"
          placeholder="추천 준비 중..."
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <QuickAction icon="🧊" label="냉장고 확인" href="/fridge" />
        <QuickAction icon="📅" label="이번 주 식단" href="/meals" />
        <QuickAction icon="🏪" label="근처 식당" href="/more" />
        <QuickAction icon="🛵" label="배달 브랜드" href="/more" />
      </div>

      {/* Budget Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 mb-1">이번 달 식비</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-gray-800">–</span>
          <span className="text-sm text-gray-400 mb-1">/ 예산 미설정</span>
        </div>
        <div className="mt-2 h-2 bg-gray-100 rounded-full">
          <div className="h-2 bg-orange-400 rounded-full w-0" />
        </div>
      </div>
    </div>
  );
}

function MealCard({
  type,
  timeRange,
  placeholder,
}: {
  type: string;
  timeRange: string;
  placeholder: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold text-orange-500">{type}</span>
          <span className="ml-2 text-xs text-gray-400">{timeRange}</span>
        </div>
        <button className="text-xs bg-orange-50 text-orange-500 px-3 py-1 rounded-full font-medium">
          추천받기
        </button>
      </div>
      <div className="bg-gray-50 rounded-xl p-3 text-center">
        <p className="text-gray-400 text-sm">{placeholder}</p>
        <p className="text-xs text-gray-300 mt-1">가족 정보를 설정하면 맞춤 추천이 시작됩니다</p>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: string;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:bg-orange-50 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </a>
  );
}
