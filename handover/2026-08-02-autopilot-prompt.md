# Pick Up! (momoji) — 오토파일럿 세션 프롬프트
아래 내용을 새 Cowork 창에 붙여넣고 오토파일럿 모드로 시작하세요.

---

Pick Up! (momoji) 프로젝트 이어서 작업해줘. 오토파일럿 모드로, 막히는 부분은 우회하거나 스킵하고 끝까지 진행한 뒤 마지막에 한 번만 보고해줘.

**기본 정보**
- GitHub: everydayumay/momoji (public repo)
- 레포 위치: ~/Documents/Claude/momoji
- 배포: https://momoji.vercel.app
- 스택: Next.js App Router + TypeScript + Tailwind + Firebase(Auth/Firestore) + Claude API + Vercel
- 핸드오버 문서: `~/Documents/Claude/momoji/handover/2026-08-01-handover.md` — 먼저 이 파일을 읽고 현재 상태와 알려진 이슈를 파악한 뒤 시작해줘.

**작업 전 필수**
- `git pull` 로 최신 상태 확인 후 시작
- Cowork 샌드박스에서 git 실행이 불안정할 수 있음(과거 `.git/index.lock` 삭제 권한 문제 발생 이력 있음) — 문제 생기면 git은 건드리지 말고 코드만 작성해두고, 마지막 보고에 사용자가 터미널에서 실행할 pull/build/commit/push 명령을 정확히 적어줘
- 코드 작업 완료 후 `npm run build` + lint로 검증하고, 가능하면 직접 git add/commit/push까지 진행
- 커밋 메시지는 **작은따옴표**로, `!` 같은 특수문자 넣지 말 것 (큰따옴표+특수문자 조합으로 bash가 멈춘 사고 있었음)

**오늘 할 작업 (우선순위 순)**

### 1. Firestore 보안 규칙 B안 적용 (조건부)
현재 Firestore 규칙은 "로그인한 사용자면 누구나 허용"(A안) 상태. 이걸 부부 두 계정만 허용하도록 강화하는 게 목표(B안). 다만 **아내 이메일을 모르면 이 작업은 건너뛰고 보고에 남겨줘** — 임의로 추측한 이메일을 넣으면 안 됨. 코드/설정 파일이 아니라 Firebase 콘솔에서 직접 수정해야 하는 항목이라, 진행 못 하면 사용자에게 규칙 텍스트만 마지막 보고에 준비해줘.

### 2. 식비 기록 기능 (핵심 작업)
- `mealHistory` 컬렉션 CRUD 화면 구현 — 날짜, 끼니(아침/점심/저녁/간식), 메뉴명, 유형(집밥/외식/배달), 금액을 기록. `src/types/firestore.ts`에 타입은 이미 정의돼 있음(`MealHistory`), 실제 사용하는 화면이 없는 상태
- 홈 화면(`/`)과 식단 화면(`/meals`)의 추천 카드에 "이거 먹었어요" 버튼 추가 → 누르면 메뉴명/유형을 미리 채운 기록 폼이 뜨고 금액만 입력하면 저장되도록 (매번 처음부터 타이핑하지 않게)
- 홈 화면 하단의 "이번 달 식비" 카드(`src/app/page.tsx`)를 실제 `mealHistory` 합계 + `families/main`의 `monthlyBudget`과 연동. 지금은 항상 "–" 로 표시되는 더미 상태
- 기록 목록을 볼 수 있는 화면도 하나 필요 (간단한 리스트면 충분, 날짜별 그룹핑)
- 모바일 UI 스타일은 기존 화면들(냉장고, 가족 설정 등)의 바텀시트 모달 패턴을 그대로 따라줘. 모달 폭은 `max-w-[390px] mx-auto` 통일할 것

### 3. Mission Control 대시보드 연동
개인 대시보드(`https://ai-dashboard-pink-iota.vercel.app/api/state`)에 이 프로젝트 진행률을 자동 보고하는 걸 셋업해줘.
- 레포 루트에 `progress.json` 생성 — `key`, `unit`, `steps`(각 `{text, done, duration}`) 배열. 완료/예정 단계는 핸드오버 문서의 "5주 로드맵"과 "완료된 작업" 섹션을 참고해서 채워줘
- `scripts/report-progress.mjs` 생성 — `progress.json`을 읽어 `done` 개수/전체 개수로 percent 계산, 다음 미완료 단계를 `nextAction`으로, **`git log -1 --format=%cd --date=format-local:%Y-%m-%d` (TZ=Asia/Seoul)** 로 뽑은 마지막 커밋 날짜를 `lastWorked`로 채워서 POST
- `.github/workflows/dashboard.yml` 생성 — main에 push될 때 + 매일 07:00 KST + 수동 실행(`workflow_dispatch`) 트리거로 위 스크립트 실행
- `key`는 `"project:pickup"` 사용
- **`/api/state`에 인증이 필요한지 확인되지 않았음** — 일단 무인증으로 구현하되, 스크립트에 `DASHBOARD_TOKEN` 시크릿이 있으면 `Authorization: Bearer` 헤더를 붙이는 분기를 넣어줘(시크릿 없으면 그냥 생략). GitHub Actions 시크릿 등록은 사용자가 직접 해야 하니, 시크릿 이름과 등록 경로(Settings → Secrets and variables → Actions)를 마지막 보고에 안내해줘
- 실제 POST 전송 테스트는 sandbox에서 네트워크가 막혀 있을 수 있으니, 실패하면 코드만 완성해두고 보고에 남겨줘

**작업 순서 원칙**
1번은 정보가 없으면 즉시 스킵하고 2번으로. 2번이 가장 크니 충분히 시간을 쓰고, 3번은 2번이 끝난 뒤 여유 있으면 진행. 세 가지 다 끝나면 handover 폴더에 새 핸드오버 문서(`2026-08-0X-handover.md` 형식)를 만들어서 오늘 완료한 것 / 남은 것 / 다음 세션 프롬프트 초안까지 정리해줘.

**최종 보고에 포함할 것**
- 완료/스킵/실패 항목 명확히 구분
- 사용자가 터미널에서 실행해야 할 명령어 (있다면)
- 사용자가 결정해야 할 것 (아내 이메일, 일정 탭 방향, 대시보드 인증 여부 등)
