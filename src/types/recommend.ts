import type { Timestamp } from "firebase/firestore";

export type GiLevel = "low" | "medium" | "high";

export interface Menu {
  name: string;
  description: string;
  cookTime: string;
  usedIngredients: string[];
  steps: string[];
  /** 가족 건강 메모(예: 임신성 당뇨)를 반영한 이유. 없을 수 있음 */
  healthNote?: string;
  /** 예상 칼로리 (kcal). 이전 버전 데이터에는 없을 수 있어 optional */
  calories?: number;
  /** 탄수화물 (g) */
  carbs?: number;
  /** 단백질 (g) */
  protein?: number;
  /** 지방 (g) */
  fat?: number;
  /** 혈당 영향 (임신성 당뇨 참고용) */
  giLevel?: GiLevel;
}

export interface RecommendRequest {
  ingredients: { name: string; amount: number; unit?: string }[];
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

/** 끼니 하나에 대한 저장된 추천 */
export interface SlotRecommendation {
  menus: Menu[];
  /** 생성 당시의 냉장고+가족 상태 서명. 달라지면 "재료가 바뀌었어요" 표시 */
  signature: string;
  updatedAt?: Timestamp;
  updatedBy?: string | null;
}

/** dailyRecommendations/{YYYY-MM-DD} 문서 구조 */
export interface DailyRecommendationDoc {
  date: string;
  slots?: Record<string, SlotRecommendation>;
}
