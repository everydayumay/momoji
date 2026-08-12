// Firestore collection path constants
export const COLLECTIONS = {
  FAMILIES: "families",
  MEMBERS: "members",
  FRIDGE: "fridge",
  MEAL_HISTORY: "mealHistory",
  RESTAURANTS: "restaurants",
  DELIVERY_BRANDS: "deliveryBrands",
  /** 문서 ID = "YYYY-MM-DD" (한국 시간 기준). 가족이 같은 추천을 공유한다 */
  DAILY_RECOMMENDATIONS: "dailyRecommendations",
} as const;

/** 냉장고 수량 단위 선택지 */
export const FRIDGE_UNITS = [
  "개",
  "g",
  "kg",
  "ml",
  "L",
  "봉지",
  "팩",
  "단",
  "모",
  "마리",
  "컵",
  "큰술",
] as const;

export const DEFAULT_FRIDGE_UNIT = "개";

/** families 컬렉션의 유일한 문서 ID (부부 단일 가족 가정) */
export const FAMILY_DOC_ID = "main";
