import { Timestamp } from "firebase/firestore";

export interface Family {
  familyId: string;
  members: string[];
  monthlyBudget: number;
  createdAt: Timestamp;
}

export interface Member {
  name: string;
  healthNotes: string;
  mealTimes: string[];
  preferences: string[];
}

export interface FridgeItem {
  name: string;
  amount: number;
  /** 수량 단위 (개/g/ml/봉지 등). 기존 데이터에는 없을 수 있어 optional */
  unit?: string;
  category: string;
  updatedAt: Timestamp;
}

export interface MealHistory {
  date: Timestamp;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  menu: string;
  type: "home" | "restaurant" | "delivery";
  cost: number;
}

export interface Restaurant {
  name: string;
  category: string;
  openHours: string;
  distanceMin: number;
  avgCost: number;
  notes: string;
}

export interface DeliveryBrand {
  name: string;
  category: string;
  avgCost: number;
  satisfactionScore: number;
  activeCoupon: boolean;
}
