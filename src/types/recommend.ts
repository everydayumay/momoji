export interface Menu {
  name: string;
  description: string;
  cookTime: string;
  usedIngredients: string[];
  steps: string[];
  /** 가족 건강 메모(예: 임신성 당뇨)를 반영한 이유. 없을 수 있음 */
  healthNote?: string;
}

export interface RecommendRequest {
  ingredients: { name: string; amount: number }[];
  members?: {
    name?: string;
    healthNotes?: string;
    mealTimes?: string[];
    preferences?: string[];
  }[];
  /** "아점" | "저녁" 등 식사 구분. 없으면 시간대 무관 추천 */
  mealType?: string;
  /** 추천 메뉴 개수 (1~5, 기본 3) */
  count?: number;
}

export interface RecommendResponse {
  menus: Menu[];
}
