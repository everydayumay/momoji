import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, FAMILY_DOC_ID } from "@/lib/firestore-schema";
import { kstDateKey } from "@/lib/today";
import type { Menu } from "@/types/recommend";

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
};

/** 그리드 행: 아점(→lunch) / 저녁(→dinner). mealHistory의 mealType 값과 맞춘다 */
export const WEEKLY_SLOTS = [
  { key: "아점", mealType: "lunch" } as const,
  { key: "저녁", mealType: "dinner" } as const,
];
export type WeeklyMealType = (typeof WEEKLY_SLOTS)[number]["mealType"];

export interface WeeklyPlanSlot {
  day: WeekDay;
  mealType: WeeklyMealType;
  menu: string;
  source: "manual" | "ai";
  description?: string;
  cookTime?: string;
  usedIngredients?: string[];
  healthNote?: string;
  steps?: string[];
  updatedAt?: Timestamp;
}

export type WeeklyPlanSlotWithId = WeeklyPlanSlot & { id: string };

function toUTCDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

/** KST 기준 오늘이 속한 주의 월요일 (연/월/일 정수). 타임존에 영향받지 않도록 UTC 정수 연산만 사용 */
export function getWeekStartYMD(date: Date = new Date()) {
  const [y, m, d] = kstDateKey(date).split("-").map(Number);
  const utc = toUTCDate(y, m, d);
  const dow = utc.getUTCDay() || 7; // 월=1..일=7
  utc.setUTCDate(utc.getUTCDate() - (dow - 1));
  return { y: utc.getUTCFullYear(), m: utc.getUTCMonth() + 1, d: utc.getUTCDate() };
}

/** 월~일 7일치 { day, y, m, d } 배열 */
export function getWeekDates(date: Date = new Date()) {
  const start = getWeekStartYMD(date);
  const utcMonday = toUTCDate(start.y, start.m, start.d);
  return WEEK_DAYS.map((day, i) => {
    const cur = new Date(utcMonday);
    cur.setUTCDate(utcMonday.getUTCDate() + i);
    return { day, y: cur.getUTCFullYear(), m: cur.getUTCMonth() + 1, d: cur.getUTCDate() };
  });
}

/** ISO 8601 주차 문자열 (예: "2026-W33") — Firestore 문서 ID로 사용 */
export function getWeekKey(date: Date = new Date()) {
  const start = getWeekStartYMD(date);
  const utcMonday = toUTCDate(start.y, start.m, start.d);
  const thursday = new Date(utcMonday);
  thursday.setUTCDate(utcMonday.getUTCDate() + 3);
  const isoYear = thursday.getUTCFullYear();
  const yearStart = toUTCDate(isoYear, 1, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function formatWeekDateLabel({ m, d }: { m: number; d: number }) {
  return `${m}/${d}`;
}

function slotsCollection(weekKey: string) {
  return collection(db, COLLECTIONS.WEEKLY_PLAN, FAMILY_DOC_ID, "weeks", weekKey, "slots");
}

function slotDocId(day: WeekDay, mealType: WeeklyMealType) {
  return `${day}-${mealType}`;
}

export function subscribeWeeklyPlan(
  weekKey: string,
  cb: (slots: Record<string, WeeklyPlanSlotWithId>) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    slotsCollection(weekKey),
    (snap) => {
      const map: Record<string, WeeklyPlanSlotWithId> = {};
      snap.docs.forEach((d) => {
        map[d.id] = { id: d.id, ...(d.data() as WeeklyPlanSlot) };
      });
      cb(map);
    },
    (err) => {
      console.error("weeklyPlan subscribe error:", err);
      onError?.(err);
    }
  );
}

export interface SaveSlotInput {
  weekKey: string;
  day: WeekDay;
  mealType: WeeklyMealType;
  menu: string;
  source: "manual" | "ai";
  menuDetail?: Partial<Menu>;
}

export async function saveWeeklyPlanSlot(input: SaveSlotInput) {
  const { weekKey, day, mealType, menu, source, menuDetail } = input;
  const data: WeeklyPlanSlot = {
    day,
    mealType,
    menu,
    source,
    updatedAt: Timestamp.now(),
  };
  if (menuDetail?.description) data.description = menuDetail.description;
  if (menuDetail?.cookTime) data.cookTime = menuDetail.cookTime;
  if (menuDetail?.usedIngredients) data.usedIngredients = menuDetail.usedIngredients;
  if (menuDetail?.healthNote) data.healthNote = menuDetail.healthNote;
  if (menuDetail?.steps) data.steps = menuDetail.steps;

  await setDoc(doc(slotsCollection(weekKey), slotDocId(day, mealType)), data);
}

export async function deleteWeeklyPlanSlot(
  weekKey: string,
  day: WeekDay,
  mealType: WeeklyMealType
) {
  await deleteDoc(doc(slotsCollection(weekKey), slotDocId(day, mealType)));
}
