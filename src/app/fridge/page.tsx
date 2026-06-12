export default function FridgePage() {
  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">냉장고</h1>
      <div className="bg-white rounded-2xl p-6 text-center text-gray-400 shadow-sm border border-gray-100">
        <p className="text-3xl mb-2">🧊</p>
        <p className="text-sm">냉장고가 비어 있습니다</p>
        <p className="text-xs mt-1">재료를 추가해서 맞춤 식단 추천을 받아보세요</p>
      </div>
    </div>
  );
}
