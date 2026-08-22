import type { GiLevel } from "@/types/recommend";

export const GI_LEVEL_LABELS: Record<GiLevel, string> = {
  low: "혈당 영향 낮음",
  medium: "혈당 영향 보통",
  high: "혈당 영향 높음",
};

export const GI_LEVEL_EMOJI: Record<GiLevel, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🔴",
};

interface NutritionData {
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  giLevel?: GiLevel;
}

interface Props {
  data: NutritionData;
  /** 한 줄로 축약해서 표시 (목록/카드용). 기본은 4칸 그리드 */
  compact?: boolean;
}

/** 칼로리/탄단지 + 혈당 영향 배지. 값이 하나도 없으면 아무것도 렌더링하지 않는다 */
export default function NutritionInfo({ data, compact }: Props) {
  const { calories, carbs, protein, fat, giLevel } = data;
  const hasMacros = [calories, carbs, protein, fat].some((v) => typeof v === "number");
  if (!hasMacros && !giLevel) return null;

  if (compact) {
    const parts: string[] = [];
    if (typeof calories === "number") parts.push(`${calories}kcal`);
    if (typeof carbs === "number") parts.push(`탄 ${carbs}g`);
    if (typeof protein === "number") parts.push(`단 ${protein}g`);
    if (typeof fat === "number") parts.push(`지 ${fat}g`);
    return (
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {parts.length > 0 && (
          <span className="text-[11px] text-gray-400">{parts.join(" · ")}</span>
        )}
        {giLevel && (
          <span className="text-[11px] text-gray-500">
            {GI_LEVEL_EMOJI[giLevel]} {GI_LEVEL_LABELS[giLevel]}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2.5 space-y-2">
      {hasMacros && (
        <div className="grid grid-cols-4 gap-1.5">
          <NutrientCell label="칼로리" value={calories != null ? `${calories}` : "-"} unit="kcal" />
          <NutrientCell label="탄수화물" value={carbs != null ? `${carbs}` : "-"} unit="g" />
          <NutrientCell label="단백질" value={protein != null ? `${protein}` : "-"} unit="g" />
          <NutrientCell label="지방" value={fat != null ? `${fat}` : "-"} unit="g" />
        </div>
      )}
      {giLevel && (
        <p className="text-xs bg-gray-50 rounded-lg px-2.5 py-1.5 text-gray-600">
          {GI_LEVEL_EMOJI[giLevel]} {GI_LEVEL_LABELS[giLevel]}
        </p>
      )}
    </div>
  );
}

function NutrientCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-gray-50 rounded-lg py-1.5 text-center">
      <p className="text-[9px] text-gray-400">{label}</p>
      <p className="text-[11px] font-semibold text-gray-700">
        {value}
        <span className="text-[9px] font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  );
}
