import type { RecommendRequest } from "@/types/recommend";

type Ingredient = RecommendRequest["ingredients"][number];
type MemberInput = NonNullable<RecommendRequest["members"]>[number];

function buildIngredientList(ingredients: Ingredient[]) {
  return ingredients
    .map((i) => `${i.name} ${i.amount}${i.unit?.trim() || "개"}`)
    .join(", ");
}

function buildFamilySection(members: MemberInput[]) {
  if (members.length === 0) return "";

  const lines = members.map((m) => {
    const detail: string[] = [];
    if (m.healthNotes?.trim()) detail.push(`건강 메모: ${m.healthNotes.trim()}`);
    if (m.preferences?.length) detail.push(`선호: ${m.preferences.join(", ")}`);
    if (m.mealTimes?.length) detail.push(`식사 시간: ${m.mealTimes.join(", ")}`);
    const name = m.name?.trim() || "구성원";
    return detail.length > 0 ? `- ${name} (${detail.join(" / ")})` : `- ${name}`;
  });

  return `\n\n가족 구성원:\n${lines.join("\n")}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RecommendRequest>;

    const ingredients: Ingredient[] = Array.isArray(body?.ingredients)
      ? body.ingredients
      : [];
    const members: MemberInput[] = Array.isArray(body?.members) ? body.members : [];
    const mealType =
      typeof body?.mealType === "string" && body.mealType.trim()
        ? body.mealType.trim()
        : undefined;
    const count = Math.min(Math.max(Number(body?.count) || 3, 1), 5);

    if (ingredients.length === 0) {
      return Response.json({ error: "냉장고에 재료가 없습니다" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set");
      return Response.json({ error: "AI 설정이 완료되지 않았습니다" }, { status: 500 });
    }

    const mealSection = mealType ? `\n식사 구분: ${mealType}` : "";

    const prompt = `냉장고 재료: ${buildIngredientList(ingredients)}${mealSection}${buildFamilySection(members)}

위 정보를 바탕으로 집밥 메뉴 ${count}가지를 추천해주세요.

지침:
- 냉장고에 있는 재료를 최대한 활용하세요. 부족한 재료는 마트에서 쉽게 구할 수 있는 것만 소량 추가하세요.
- 재료 뒤의 수량과 단위(개/g/ml/봉지 등)를 그대로 해석해서, 실제로 만들 수 있는 분량의 메뉴만 추천하세요.
- 가족 구성원의 건강 메모를 반드시 반영하세요. 예를 들어 임신성 당뇨가 있으면 정제 탄수화물과 설탕을 줄이고, 저GI 곡물·단백질·식이섬유 위주로 구성하세요.
- 가성비를 중요하게 생각하는 가족입니다. 비싼 식재료나 특수한 재료는 피하세요.
- 식사 구분이 주어졌다면 그 시간대에 어울리는 부담 없는 메뉴로 추천하세요.
- healthNote에는 건강 메모를 어떻게 반영했는지 20자 이내로 적고, 반영할 건강 메모가 없으면 빈 문자열을 넣으세요.
- 완성된 1인분 기준으로 calories(kcal, 정수), carbs/protein/fat(g, 정수)을 실제 음식 상식에 맞게 추정하세요.
- giLevel은 이 메뉴가 혈당에 미치는 영향을 "low"(저GI) / "medium"(보통) / "high"(고GI, 정제 탄수화물·단순당 위주) 중 하나로 판단하세요. 임신성 당뇨가 있는 가족 구성원이 있다면 이 값을 더 보수적으로(애매하면 한 단계 높게) 판단하세요.

반드시 아래 JSON만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

{
  "menus": [
    {
      "name": "메뉴명",
      "description": "한 줄 설명 (20자 이내)",
      "cookTime": "조리 시간 (예: 20분)",
      "usedIngredients": ["재료1", "재료2"],
      "healthNote": "건강 메모 반영 내용 (없으면 \\"\\")",
      "calories": 450,
      "carbs": 55,
      "protein": 20,
      "fat": 12,
      "giLevel": "low",
      "steps": [
        "1. 조리 단계 설명",
        "2. 조리 단계 설명",
        "3. 조리 단계 설명",
        "4. 조리 단계 설명"
      ]
    }
  ]
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 450 + count * 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return Response.json({ error: "AI 서비스 오류" }, { status: 502 });
    }

    const data = await res.json();
    const text: string = data.content[0].text.trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "응답 파싱 실패" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch (err) {
    console.error("recommend route error:", err);
    return Response.json({ error: "서버 오류" }, { status: 500 });
  }
}
