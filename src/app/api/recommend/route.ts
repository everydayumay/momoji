export async function POST(request: Request) {
  try {
    const { ingredients } = await request.json();

    if (!ingredients || ingredients.length === 0) {
      return Response.json({ error: "냉장고에 재료가 없습니다" }, { status: 400 });
    }

    const ingredientList = ingredients
      .map((i: { name: string; amount: number }) => `${i.name} ${i.amount}개`)
      .join(", ");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `냉장고 재료: ${ingredientList}

위 재료로 만들 수 있는 집밥 메뉴 3가지를 추천해주세요. 반드시 아래 JSON만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

{
  "menus": [
    {
      "name": "메뉴명",
      "description": "한 줄 설명 (20자 이내)",
      "cookTime": "조리 시간 (예: 20분)",
      "usedIngredients": ["재료1", "재료2"],
      "steps": [
        "1. 조리 단계 설명",
        "2. 조리 단계 설명",
        "3. 조리 단계 설명",
        "4. 조리 단계 설명"
      ]
    }
  ]
}`,
          },
        ],
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
