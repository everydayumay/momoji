export default function MealsPage() {
  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">식단</h1>
      <div className="bg-white rounded-2xl p-6 text-center text-gray-400 shadow-sm border border-gray-100">
        <p className="text-3xl mb-2">🍽️</p>
        <p className="text-sm">식단 기록이 없습니다</p>
        <p className="text-xs mt-1">가족 정보 설정 후 식단을 기록해보세요</p>
      </div>
    </div>
  );
}
