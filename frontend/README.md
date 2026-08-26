# 여행 정산 — 프론트엔드

해외여행 공동 경비를 링크 하나로 정산하는 모바일 웹.
**flow #1 (방 개설 · 참여)** 부터 **flow #4 (환율 · 최종 정산)** 까지 전 구간이 구현되어 있다.

가입·설치 없이 링크로 참여하고, 정산방은 만든 날부터 **7일 뒤 자동 삭제**된다.

## 실행

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:5173
```

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 체크 + 프로덕션 빌드 |
| `npm run typecheck` | 타입 체크만 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run api:generate` | 백엔드 OpenAPI 명세에서 타입·fetch 클라이언트 생성 |

## OpenAPI 클라이언트 생성

백엔드를 실행한 뒤 아래 명령으로 springdoc이 제공하는 명세
(`http://localhost:8080/v3/api-docs`)를 받아 타입과 fetch 클라이언트를 생성한다.

```bash
npm run api:generate
```

생성 파일은 `src/api/generated`에 저장한다. 프런트 빌드가 실행 중인 백엔드에
의존하지 않도록 생성 결과도 Git으로 관리한다. 다른 환경의 명세를 사용할 때는
`OPENAPI_SPEC_URL`을 지정한다.

```bash
OPENAPI_SPEC_URL=https://api.example.com/v3/api-docs npm run api:generate
```

생성된 함수와 타입을 `src/services`에서 import해 사용한다. 명세가 바뀌면 같은
명령을 다시 실행한다.

## 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | 백엔드 베이스 URL. 로컬에서는 Vite가 `localhost:8080`으로 프록시 |
| `VITE_USE_MOCK` | `true` | `true`면 `src/mocks`로 동작. **백엔드를 붙일 때 `false`** |
| `VITE_SHARE_LINK_ORIGIN` | (비움) | 공유 링크에 쓸 origin. 비우면 현재 접속 origin |

우선순위는 **호스팅 대시보드 환경변수 > `.env.local` > `.env.production` > `.env`** 다.
Vite 는 실행 시점에 이미 존재하는 환경변수를 `.env` 파일보다 우선한다.

## 배포 (Vercel)

`vercel.json` 과 `.env.production` 이 저장소에 있어 추가 설정 없이 배포된다.

- **`vercel.json`** — SPA 리라이트. 이게 없으면 `/r/{shareCode}` 공유 링크를 새 탭에서 열 때
  Vercel 이 404 를 낸다. 링크 공유가 이 서비스의 핵심 플로우라 필수다
- **`.env.production`** — 백엔드가 없는 동안 배포본도 목데이터로 뜨게 한다

백엔드가 준비되면 `.env.production` 을 지우거나, Vercel > Settings > Environment Variables 에
`VITE_USE_MOCK=false` 와 `VITE_API_BASE_URL` 을 넣는다. 대시보드 값이 파일보다 우선한다.

> `VITE_USE_MOCK` 없이 배포하면 존재하지 않는 `/api` 로 요청이 나가 화면에
> `요청을 처리하지 못했어요. (404)` 만 뜬다. 이 경우 브라우저 콘솔에 원인을 안내하는 경고가 찍힌다.

## 백엔드 연결

1. `docs/api-contract.md`의 엔드포인트를 구현한다
2. `.env.local`에서 `VITE_USE_MOCK=false`, `VITE_API_BASE_URL`을 실제 주소로
3. **화면 코드는 건드릴 필요가 없다.** 목/실제 분기는 `src/services/*.ts` 안에만 있다

`docs/api-contract.md` 하단의 **ERD 보완 제안 3건**을 먼저 확인할 것.

## 화면

| ID | 화면 | 경로 |
|---|---|---|
| A-01 | 랜딩 | `/` |
| A-02 | 인원 수 | `/create/members` |
| A-03 · A-04 | 닉네임 입력 · 검증 에러 | `/create/nicknames` |
| — | 방 이름 입력 | `/create/name` |
| A-05 | 생성 완료 · 링크 공유 | `/create/done/:shareCode` |
| A-06 | 링크 진입 · 닉네임 선택 | `/r/:shareCode` |
| A-08 | 만료된 방 | `/r/:shareCode` (410 응답 시) |
| B-01 | 정산방 (빈 상태 / 내역 있음) | `/r/:shareCode/home` |

### flow #2 — 결제 내역 등록

| ID | 화면 | 경로 |
|---|---|---|
| C-01 | 등록 방식 선택 | `/r/:shareCode/expenses/new` |
| C-02 | 선택한 스크린샷 확인 | `/r/:shareCode/expenses/upload` |
| C-04 | 파싱 중 | `/r/:shareCode/expenses/parsing` |
| C-05 · C-07 · C-08 | 파싱 결과 · 필드 누락 | `/r/:shareCode/expenses/review` |
| C-06 | 파싱 항목 수정 | `/r/:shareCode/expenses/review/:draftId` |
| C-09 | 직접 입력 | `/r/:shareCode/expenses/manual` |
| B-02 | 내 결제 내역 · 정산 포함 선택 (`+ 추가하기` → C-09) | `/r/:shareCode/expenses` |

### flow #3 — 그룹 분담

| ID | 화면 | 경로 |
|---|---|---|
| D-01 · D-04 | 그룹 목록 (`+` 추가, 스와이프 삭제) | `/r/:shareCode/groups` |
| D-02 | 그룹 인원 선택 · 수정 | `/r/:shareCode/groups/new`, `/groups/:groupId/edit` |
| D-05 · D-06 | 그룹이 낼 항목 선택 | `/r/:shareCode/groups/:groupId/items` |
| D-05 | 금액 나누기 | `/r/:shareCode/groups/:groupId/split` |
| D-09 · D-10 | 결제 1건 나누기 (N빵 · 직접 입력) | `/r/:shareCode/groups/:groupId/split/:paymentId` |
| D-12 | 자동 귀속 확인 | `/r/:shareCode/groups/confirm` |

### flow #4 — 환율 · 최종 정산

| ID | 화면 | 경로 |
|---|---|---|
| E-01 | 정산 실행 확인 | `/r/:shareCode/settlement` |
| E-04 | 환율 직접 수정 | `/r/:shareCode/settlement/rate` |
| E-05 | 참여자별 요약 | `/r/:shareCode/settlement/summary` |
| E-12 | 내 정산 완료 · 진행 현황 | `/r/:shareCode/settlement/done` |
| E-06 | 송금 리스트 | `/r/:shareCode/settlement/transfers` |
| E-07 | 내 정산 상세 | `/r/:shareCode/settlement/transfers/:index` |

**정산 규칙**

- 환율은 **방을 개설한 시점으로 고정**되어 모든 참여자에게 똑같이 적용된다.
  참여자마다 정산을 끝내는 시각이 달라서 정산 시점 환율을 쓰면 값이 갈린다
- 환율 수정은 기본 흐름에 두지 않고 E-01의 텍스트 링크로만 들어간다.
  바꾼 값은 방 전원에게 적용되고 누가 바꿨는지 함께 표시된다
- 원화 환산은 **참여자별 금액 각각에 반올림**한다. 총액과 1~2원 어긋나도 보정하지 않는다
- 송금은 받을 사람과 보낼 사람을 큰 금액부터 맞물려 **최대 (인원 − 1)건**으로 줄인다
- **전원이 자기 정산을 끝내야** 최종 송금 리스트가 열린다

**분담 규칙**

- 순서는 `그룹을 만든다 → 그 그룹이 낼 항목을 고른다` 다. 항목에서 인원을 고르는 진입점은 없다
- `전체` 그룹은 방마다 하나씩 이미 있고 지우거나 인원을 바꿀 수 없다
- 그룹은 2명 이상이어야 한다. 혼자 부담할 항목은 B-02에서 정산 대상에서 빼면 된다
- 한 항목은 한 그룹에만 속한다. 다른 그룹이 가져간 항목은 목록에 남기되 고를 수 없다
- 어디에도 담기지 않은 항목은 `전체` 그룹이 나눠 낸다. 정산을 막지 않고 D-12에서 알린다
- N빵이 나누어떨어지지 않으면 **남는 금액은 그 결제의 결제자가 부담**한다.
  결제자가 그룹에 없으면 방 참여 순서상 첫 참여자가 대신 낸다
- 직접 입력은 **합계가 결제 금액과 정확히 같아야** 진행할 수 있다

### 목 모드로 화면 확인하기

| 상황 | 방법 |
|---|---|
| B-01 **빈 상태** | `/`에서 방을 새로 만들면 결제 내역이 없다 |
| B-01 **내역 있음** | `/r/8fj2kd/home` — 시드 방(오사카 여행)에 준영의 내역 5건 |
| A-08 **만료** | `/r/expired` — 8일 전에 만들어진 방 |
| **오류 상태** | `VITE_USE_MOCK=false` + 없는 주소 → A-06·B-01에 재시도 UI |
| A-04 **검증 에러** | 닉네임을 중복 / 11자 / 공백만 입력 |
| C-05 **파싱 결과** | 아무 이미지나 3장 올린다. 목은 장마다 다른 결과를 준다 |
| C-07 · C-08 **필드 누락** | 2장째는 금액을, 3장째는 통화를 못 읽은 것으로 내려온다 |
| C-04 **전체 실패** | 목에서는 재현되지 않는다. 실제 API 가 `drafts: []` 만 줄 때 나온다 |
| B-02 **체크 기본값** | 등록 직후에는 모두 해제 상태다. 정산할 항목만 골라서 켠다 |
| D-06 **타 그룹 귀속** | 전체 그룹에서 몇 건 고른 뒤 다른 그룹을 열면 흐리게 표시된다 |
| D-12 **자동 귀속** | 일부만 그룹에 담고 `내 정산 완료하기` 를 누른다 |
| **그룹 삭제** | 그룹 카드를 옆으로 밀거나 길게 누르면 삭제 버튼이 나온다 |
| D-09 **나머지** | 3명 그룹에 3,200을 담으면 `1,066 …나머지 2` → 결제자 1,068 |
| D-10 **합계 불일치** | 직접 입력에서 합계를 다르게 하면 CTA가 비활성된다 |
| E-12 **전원 완료** | 목에서는 나 혼자만 완료된다. sessionStorage의 `oide:mock:settlementDone` 에 다른 memberId를 넣으면 `최종 정산하기`가 열린다 |
| E-04 **환율 수정** | 값을 바꾸면 E-01·E-05에 `준영님이 직접 입력한 환율이에요`가 붙는다 |

새로 만든 방은 `sessionStorage`에 보관되므로 탭을 닫으면 사라진다.

## 구조

```
src/
├── api/          fetch 래퍼 · 환경변수 (여기서만 import.meta.env 를 읽는다)
├── services/     화면이 호출하는 유일한 데이터 진입점. 목/실제 분기가 여기 있다
├── mocks/        목 데이터와 저장소. 백엔드가 붙으면 쓰이지 않는다
├── types/        API·도메인 타입. ERD 와 1:1 대응
├── constants/    라우트 · 정산방 규칙(1~10자, 최소 2명, 7일 …)
├── hooks/        useAsync(로딩·오류·재시도) · 방 생성 위저드 · 스크린샷 등록 흐름 · 로컬 신원
├── utils/        닉네임 검증 · 클립보드 · 공유 링크 · 금액·날짜 포맷
├── components/   layout(프레임·앱바·하단바) / common(버튼·입력·아바타…) / room / expense / split
├── pages/        화면 1개 = 파일 1개
└── styles/       tokens.css(디자인 토큰) · global.css
```

**규칙**

- 화면 컴포넌트에 데이터를 하드코딩하지 않는다. 목데이터는 `src/mocks`에만 둔다
- 모든 조회·생성은 `src/services`를 거친다. 컴포넌트가 `fetch`나 `localStorage`를 직접 쓰지 않는다
- 숫자 규칙(1~10자, 최소 2명, 7일, 통화)은 `src/constants/roomRules.ts`만 참조한다
- 색·간격은 `src/styles/tokens.css`의 CSS 변수를 쓴다

## 반응형

모바일 웹 전제다. 390px는 디자인 기준 폭이지 고정 폭이 아니다.

- **~430px**: 화면 전체 폭
- **431px~**: 430px 컬럼이 가운데 정렬 (데스크톱 전용 레이아웃은 없다)
- `100dvh`, `env(safe-area-inset-bottom)`, 입력 `font-size: 16px`(iOS 자동 확대 방지),
  터치 타겟 44px 이상을 적용했다

320 / 360 / 375 / 390 / 430 / 768 / 1280px에서 가로 스크롤이 없는 것을 확인했다.

## 와이어프레임과 다른 점

의도적으로 다르게 구현한 것들이다. 되돌리려면 각각 한 곳만 고치면 된다.

**flow #1**

1. **A-03의 CTA가 `다음`** — Figma는 `정산방 만들기`지만, 뒤에 방 이름 화면이 삽입되면서
   같은 문구 버튼이 연속 2개가 됐다. 실제로 방을 만드는 건 방 이름 화면이다.
   → `src/pages/CreateRoomNicknamesPage.tsx`
2. **A-02 스테퍼의 `−`는 인원 2일 때만 비활성** — Figma는 인원 4에서도 회색이라 컴포넌트 상태 오류로 봤다.
   → `src/components/common/Stepper.tsx`
3. **인원 수 상한 10명** — 요구사항에 없는 프론트 가드다. 입력 칸이 무한히 늘어나는 것을 막는다.
   → `src/constants/roomRules.ts`의 `MAX_MEMBER_COUNT`
4. **입력 필드 폰트 15px → 16px** — iOS Safari가 16px 미만 입력에 포커스하면 화면을 확대한다.
   → `src/styles/tokens.css`의 `--font-size-input`
5. **A-05의 참여자 목록을 선택 가능하게 했다** — Figma는 표시 전용이지만, 방을 만든 사람이
   첫 번째 닉네임이 아니면 신원을 바꿀 방법이 없었다. 신원이 곧 결제자라 틀리면 정산이 어긋난다.
   → `src/pages/RoomCreatedPage.tsx`

**flow #2**

6. **C-02 사진 선택 그리드(`최근 항목`)를 만들지 않았다** — 브라우저는 사진 라이브러리를
   읽을 수 없어 OS 파일 피커로 대체했다.
   → `src/pages/ExpenseMethodPage.tsx`
7. **결제자 지정 UI가 없다** — 와이어프레임에 없어 등록한 본인을 항상 결제자로 보낸다.
   FR-02의 "다른 참여자로 변경"은 화면이 생기면 붙이면 된다.
8. **C-05·C-07·C-08의 CTA 문구를 `정산할 항목 선택하기`로 통일** — Figma는 C-07·C-08에서만
   `정산 항목 선택하기`인데 같은 버튼의 상태 차이라 오타로 봤다.
   → `src/pages/ParsedResultPage.tsx`

**flow #3**

9. **그룹 삭제에 길게 누르기를 함께 붙였다** — 와이어프레임은 스와이프만 안내하지만
   터치가 없는 환경에서는 지울 방법이 없어진다.
   → `src/components/split/SwipeToDelete.tsx`
10. **D-04의 CTA를 `환율 적용하기`로 통일** — 이전 프레임(`134:8573`)은 `내 정산 완료하기`이고
    최신 프레임(`134:8611`)은 `환율 적용하기`다. 최신 쪽을 따랐고, D-12의
    `이대로 환율 적용하기`와도 맞는다.
    → `src/pages/SplitGroupListPage.tsx`
11. **D-09의 나머지 문구에 실제 나머지 값을 넣는다** — 와이어프레임은 `÷ 3명 = 106 …나머지 2`인데
    캡션은 `나누어떨어지지 않는 1은`이라 서로 어긋난다. 목업의 자리표시 숫자로 보고
    계산된 값(`3,200 ÷ 3명` → 나머지 `2`)을 그대로 쓴다.
    → `src/pages/PaymentSplitPage.tsx`

**flow #4**

12. **E-05의 카드 금액은 `부담할 금액`이다** — 와이어프레임은 4명이 모두 `211,259원`으로
    같아 자리표시로 보인다. 그룹 분담이 다르면 사람마다 다른 값이 나온다.
    → `src/pages/SettlementSummaryPage.tsx`
13. **환율 기준을 `방 개설 시점`으로 잡았다** — FR-04는 `최종 정산 시점`이지만 E-01의
    문구가 개설 시점이고, 참여자마다 정산을 끝내는 시각이 달라 정산 시점을 쓰면
    사람마다 다른 환율이 적용된다.
    → `src/services/settlementService.ts`
14. **E-12의 미완료 참여자를 흐리게 하고 `정산 중`으로 적었다** — 와이어프레임은 전원
    `내역 보기`로 그려져 있지만, 누구를 기다리는지 보이지 않으면 `최종 정산하기`가
    왜 비활성인지 알 수 없다.
    → `src/pages/SettlementDonePage.tsx`

## 의존성

런타임은 `react` · `react-dom` · `react-router-dom` 셋뿐이다.
스타일은 CSS Modules(Vite 내장)이라 추가 의존성이 없다.
