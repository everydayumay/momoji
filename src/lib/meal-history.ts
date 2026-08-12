import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestore-schema";
import type { MealHistory } from "@/types/firestore";

export type MealHistoryWithId = MealHistory & { id: string };

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const MEAL_TYPE_LABELS: Record<MealHistory["mealType"], string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export const MEAL_TYPE_EMOJI: Record<MealHistory["mealType"], string> = {
  breakfast: "🌅",
  lunch: "🍚",
  dinner: "🌙",
  snack: "🍪",
};

export const COST_TYPES = ["home", "restaurant", "delivery"] as const;

export const COST_TYPE_LABELS: Record<MealHistory["type"], string> = {
  home: "집밥",
  restaurant: "외식",
  delivery: "배달",
};

/** 현재 한국 시간 기준으로 가장 그럴듯한 끼니를 추측 */
export function guessMealType(date: Date = new Date()): MealHistory["mealType"] {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false,
    }).format(date)
  );
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export function subscribeMealHistory(
  cb: (items: MealHistoryWithId[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, COLLECTIONS.MEAL_HISTORY), orderBy("date", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealHistoryWithId)));
    },
    (err) => {
      console.error("mealHistory subscribe error:", err);
      onError?.(err);
    }
  );
}

export interface MealHistoryInput {
  date: Date;
  mealType: MealHistory["mealType"];
  menu: string;
  type: MealHistory["type"];
  cost: number;
}

export async function addMealHistory(data: MealHistoryInput) {
  await addDoc(collection(db, COLLECTIONS.MEAL_HISTORY), {
    date: Timestamp.fromDate(data.date),
    mealType: data.mealType,
    menu: data.menu,
    type: data.type,
    cost: data.cost,
  });
}

export async function updateMealHistory(id: string, data: MealHistoryInput) {
  await updateDoc(doc(db, COLLECTIONS.MEAL_HISTORY, id), {
    date: Timestamp.fromDate(data.date),
    mealType: data.mealType,
    menu: data.menu,
    type: data.type,
    cost: data.cost,
  });
}

export async function deleteMealHistory(id: string) {
  await deleteDoc(doc(db, COLLECTIONS.MEAL_HISTORY, id));
}
