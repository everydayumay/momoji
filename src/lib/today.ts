const KST = "Asia/Seoul";

/** "2026년 8월 1일 토요일" — 항상 한국 시간 기준 */
export function formatKoreanDate(date: Date = new Date()) {
  return date.toLocaleDateString("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

/** "2026-08-01" — 캐시 키/날짜 비교용 (한국 시간 기준) */
export function kstDateKey(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
