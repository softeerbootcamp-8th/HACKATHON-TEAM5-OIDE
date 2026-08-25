# API 계약 (flow #1 · 방 개설 · 참여)

프론트엔드가 실제로 호출하는 엔드포인트와 필드명을 정의한다.
`src/types/`의 TypeScript 타입이 이 문서의 구현체이므로 **둘을 함께 수정한다.**

## 공통 규약

| 항목 | 규칙 |
|---|---|
| Base URL | `VITE_API_BASE_URL` (예: `http://localhost:8080/api`) |
| 필드 표기 | **camelCase** (DB는 snake_case, 경계에서 변환) |
| 식별자 | DB `bigint` → API/TS **`string`**. JS `number`는 2^53-1까지만 안전하다 |
| 일시 | ISO-8601 UTC 문자열 (`2026-08-25T14:32:00Z`) |
| 금액 | 외화는 소수 통화가 있어 **`string`**, 원화 정산 결과는 `number`(원 단위 정수) |
| Content-Type | `application/json` |
| 타임아웃 | 10초 (`src/api/apiConfig.ts`) |

## 에러 응답

모든 실패는 아래 형태로 내려주고, 프론트는 `code`로 분기한다.

```json
{ "code": "ROOM_EXPIRED", "message": "이 정산방은 사라졌어요." }
```

| code | HTTP | 쓰이는 곳 |
|---|---|---|
| `ROOM_NOT_FOUND` | 404 | A-06, B-01 — 잘못된 공유 코드 |
| `ROOM_EXPIRED` | 410 | A-08 — 7일 경과 |
| `INVALID_NICKNAME` | 400 | 방 생성 |
| `DUPLICATE_NICKNAME` | 400 | 방 생성 |
| `TOO_FEW_MEMBERS` | 400 | 방 생성 (2명 미만) |
| `NETWORK_ERROR` | — | 클라이언트가 생성 (단절·타임아웃) |
| `UNKNOWN_ERROR` | 5xx | 분류되지 않은 실패 |

---

## POST /rooms

정산방을 만든다. `SETTLEMENT_ROOM` + `ROOM_MEMBER`를 함께 생성한다.

**요청**

```json
{
  "title": "오사카 여행",
  "defaultCurrency": "JPY",
  "members": [
    { "nickname": "준영", "displayOrder": 0 },
    { "nickname": "민서", "displayOrder": 1 },
    { "nickname": "하늘", "displayOrder": 2 },
    { "nickname": "지우", "displayOrder": 3 }
  ]
}
```

- `members`는 **2명 이상** (FR-01)
- `nickname`은 앞뒤 공백이 제거된 1~10자. 한글·영문·숫자·공백만 허용
- `displayOrder` **0번이 방을 만든 사람**이다. A-05에서 본인으로 강조되고 A-06 문구(`{닉네임}님이 미리 등록해둔…`)에도 쓰인다

**응답 `201`** — 아래 `SettlementRoom`

---

## GET /rooms/{shareCode}

공유 코드로 방을 조회한다. A-05 · A-06 · B-01이 모두 이 응답 하나로 그려진다.

**응답 `200`**

```json
{
  "id": "1",
  "shareCode": "8fj2kd",
  "title": "오사카 여행",
  "defaultCurrency": "JPY",
  "createdAt": "2026-08-23T09:12:00Z",
  "expiresAt": "2026-08-30T09:12:00Z",
  "members": [
    { "id": "11", "roomId": "1", "nickname": "준영", "displayOrder": 0, "createdAt": "2026-08-23T09:12:00Z" },
    { "id": "12", "roomId": "1", "nickname": "민서", "displayOrder": 1, "createdAt": "2026-08-23T09:12:00Z" }
  ]
}
```

- `members`는 `displayOrder` 오름차순
- 만료된 방은 본문 대신 **`410 ROOM_EXPIRED`**

---

## GET /rooms/{shareCode}/members

참여자만 다시 읽는다. 방 조회 응답에도 `members`가 있으므로 필수는 아니지만,
결제 내역 등록(flow #2)에서 참여자 목록만 갱신할 때 쓰인다.

**응답 `200`** — `RoomMember[]`

---

## GET /rooms/{shareCode}/member-payment-summaries

B-01의 "내역 있음" 상태를 그리기 위한 참여자별 등록 요약.

**응답 `200`**

```json
[
  { "memberId": "11", "nickname": "준영", "paymentCount": 5 }
]
```

- 결제 내역을 **하나도 등록하지 않은 참여자는 배열에 넣지 않는다.** 빈 배열이면 B-01은 빈 상태를 그린다
- `PAYMENT`를 `payer_member_id`로 묶어 집계하면 된다

---

## POST /rooms/{shareCode}/receipt-images

결제 스크린샷 **1장**을 올려 결제 내역을 읽어낸다. `multipart/form-data` 로 보낸다.

여러 장을 올릴 때도 장당 한 번씩 호출한다. 진행률(`3장 중 2장째`)은 프론트가
완료 개수로 세므로 서버에 파싱 작업 상태 테이블이 필요 없고, 한 장이 실패해도
나머지 장의 결과는 살릴 수 있다.

**요청** — `image` (파일), `displayOrder` (0부터)

**응답 `200`**

```json
{
  "image": { "id": "42", "url": "https://.../42.png", "displayOrder": 0 },
  "drafts": [
    {
      "id": "42-1",
      "receiptImageId": "42",
      "merchant": "이치란 라멘",
      "paidAt": "2026-08-21T20:14:00Z",
      "amount": "3200",
      "currency": "JPY"
    },
    {
      "id": "42-2",
      "receiptImageId": "42",
      "merchant": "스타벅스 난바",
      "paidAt": "2026-08-20T11:30:00Z",
      "amount": null,
      "currency": "JPY"
    }
  ]
}
```

- **한 장에 여러 건이 있으면 각각 별도 초안으로 나눈다** (FR-02)
- **읽지 못한 필드는 `null`** 로 내려준다. 빈 문자열이나 추측값을 넣지 않는다.
  화면이 `금액을 못 읽었어요` 처럼 어떤 필드가 비었는지 알려야 하기 때문이다
- `drafts` 는 아직 `PAYMENT` 가 아니다. 사용자가 확인·수정한 뒤 아래 등록 API 로 확정된다
- 아무것도 못 읽었으면 `drafts: []` 를 준다. 에러가 아니다

## POST /rooms/{shareCode}/payments

확인을 마친 결제 내역을 한 번에 등록한다.

**요청**

```json
{
  "payerMemberId": "11",
  "payments": [
    {
      "merchant": "이치란 라멘",
      "paidAt": "2026-08-21T20:14:00Z",
      "amount": "3200",
      "currency": "JPY",
      "receiptImageId": "42"
    }
  ]
}
```

- `amount` · `currency` 는 **필수**, `merchant` · `paidAt` 은 `null` 허용 (FR-02)
- 직접 입력한 내역은 `receiptImageId: null`
- `payerMemberId` 는 등록한 본인이다. 결제자 변경 UI 가 없어 항상 이 값이 온다
- 등록 직후 `includedInSettlement` 는 **`false`**. B-02 에서 정산할 항목만 골라 켠다.
  요청에 `includedInSettlement: true` 를 실어 보내면 그대로 켠 채로 만든다
  (분담 화면의 `빠뜨린 항목 추가하기`)

**응답 `201`** — `Payment[]`

## GET /rooms/{shareCode}/payments

**쿼리** — `payerMemberId` (선택). 주면 그 사람이 결제한 것만 거른다.

**응답 `200`** — `Payment[]`, `paidAt` 내림차순. `paidAt` 이 `null` 인 건 마지막으로.

## PATCH /rooms/{shareCode}/payments/{paymentId}

정산에 포함할지 여부를 바꾼다. B-02 의 원형 체크가 호출한다.

**요청** — `{ "includedInSettlement": false }`
**응답 `200`** — `Payment`

---

## GET /rooms/{shareCode}/split-groups

방의 분담 그룹 목록. **`전체` 그룹이 항상 첫 번째**로 온다.

`전체` 는 사용자가 만들지 않는다. 방을 만들 때 방 전원으로 서버가 함께 만들어두고,
지우거나 인원을 바꿀 수 없다.

**응답 `200`**

```json
[
  {
    "id": "1",
    "roomId": "1",
    "name": "전체",
    "type": "ALL",
    "memberIds": ["11", "12", "13", "14"],
    "createdAt": "2026-08-23T09:12:00Z",
    "updatedAt": "2026-08-23T09:12:00Z"
  },
  {
    "id": "2",
    "roomId": "1",
    "name": "민서·하늘",
    "type": "CUSTOM",
    "memberIds": ["12", "13"],
    "createdAt": "2026-08-25T10:00:00Z",
    "updatedAt": "2026-08-25T10:00:00Z"
  }
]
```

- `name` 은 **서버가 만든다.** 닉네임을 가운뎃점으로 나열하고, 5명 이상이면 `민서 외 4명`
- `type` 이 `ALL` 인 그룹은 방마다 정확히 하나다

## POST /rooms/{shareCode}/split-groups

**요청** — `{ "memberIds": ["12", "13"] }`

- **2명 이상**이어야 한다. 1명짜리 그룹은 만들 수 없다.
  혼자 부담할 항목은 정산 대상에서 빼는 것(`includedInSettlement: false`)으로 처리한다
- 전원을 고른 조합도 `CUSTOM` 으로 만들지 않는다. 그건 `전체` 그룹이다

**응답 `201`** — `SplitGroup`

## PATCH /rooms/{shareCode}/split-groups/{groupId}

그룹 인원을 바꾼다. `name` 도 새 조합으로 다시 만들어진다.

**요청** — `{ "memberIds": ["12", "13", "14"] }`
**응답 `200`** — `SplitGroup`

`type` 이 `ALL` 인 그룹에는 쓸 수 없다.

## DELETE /rooms/{shareCode}/split-groups/{groupId}

그룹을 지운다. **담겨 있던 결제 항목은 `split_group_id` 가 `null` 로 돌아간다**
(미분류 → 정산 시 `전체` 그룹으로 자동 귀속).

`type` 이 `ALL` 인 그룹은 지울 수 없다.

**응답 `204`**

## PUT /rooms/{shareCode}/split-groups/{groupId}/payments

그룹이 낼 항목을 확정한다. 보낸 목록이 곧 최종 상태다.

**요청** — `{ "paymentIds": ["101", "104", "105"] }`

- 목록에 없는데 이 그룹에 담겨 있던 항목은 **미분류로 되돌린다**
- **한 결제 항목은 한 그룹에만 속한다.** 다른 그룹이 이미 가져간 항목이 들어오면
  `409 PAYMENT_ALREADY_ASSIGNED` 로 거절한다. 화면은 그런 항목을 고를 수 없게 막고 있다

**응답 `200`** — 방의 `Payment[]` (갱신된 상태)

---

## GET /rooms/{shareCode}/payments/{paymentId}/shares

결제 1건의 참여자별 부담액. 아직 나누지 않았으면 빈 배열이다.

**응답 `200`** — `PaymentShare[]`

## PUT /rooms/{shareCode}/payments/{paymentId}/shares

결제 1건을 어떻게 나눌지 확정한다.

**요청**

```json
{
  "splitMethod": "EQUAL",
  "shares": [
    { "memberId": "11", "shareAmount": "1068" },
    { "memberId": "12", "shareAmount": "1066" },
    { "memberId": "13", "shareAmount": "1066" }
  ]
}
```

- **최종 금액을 그대로 보낸다.** `EQUAL` 이어도 서버가 다시 계산하지 않는다.
  사용자가 화면에서 본 숫자와 저장된 숫자가 어긋나지 않게 하기 위함이다
- `shares` 의 합은 결제 금액과 **정확히 같아야** 한다. 다르면 `400 SHARE_SUM_MISMATCH`
- 대상은 그 결제가 담긴 그룹의 인원이다

**응답 `200`** — `Payment` (`splitMethod` 갱신됨)

### N빵 계산 규칙 (FR-03)

프론트가 이렇게 계산해서 보낸다. 서버가 검증할 때도 같은 규칙을 쓴다.

```
몫    = floor(결제금액 / 인원수)
나머지 = 결제금액 - 몫 × 인원수
```

- **남는 금액은 그 결제의 결제자가 부담한다.** 재계산해도 결과가 같고 화면에
  근거를 한 줄로 적을 수 있어서다
- 결제자가 그 그룹에 없으면 `display_order` 가 가장 앞선 참여자가 대신 부담한다
- 예: `3,200 ÷ 3명` → 몫 1,066 · 나머지 2 → 결제자 **1,068**, 나머지 둘 **1,066**

---

## GET /rooms/{shareCode}/rates

방에 적용되는 통화별 환율. **방을 개설한 시점으로 고정**되어 모든 참여자에게 똑같이 적용된다.

참여자마다 정산을 끝내는 시각이 달라서, 정산 시점 환율을 쓰면 사람마다 다른 값이
적용된다. 그래서 개설 시점으로 못박는다.

**응답 `200`**

```json
{
  "rates": [
    {
      "id": "1",
      "settlementId": "1",
      "currency": "JPY",
      "rateToKrw": "9.31",
      "rateSource": "AUTO",
      "effectiveDate": "2026-08-23",
      "quotedAt": "2026-08-23T23:17:00Z"
    }
  ],
  "editedByNickname": null
}
```

- `quotedAt` 을 **항상 함께** 내려준다. 화면은 환율 숫자를 단독으로 노출하지 않는다 (FR-04)
- 직접 입력된 환율이면 `rateSource: "MANUAL"` 이고 `editedByNickname` 에 바꾼 사람이 담긴다

## PUT /rooms/{shareCode}/rates

환율을 직접 지정한다. **방 전원에게 적용된다.**

**요청** — `{ "currency": "JPY", "rateToKrw": "9.48" }`
**응답 `200`** — 위와 같은 형태

## DELETE /rooms/{shareCode}/rates

직접 입력한 환율을 지우고 자동 환율로 되돌린다.

**응답 `200`** — 위와 같은 형태

## GET /rooms/{shareCode}/settlement/progress

자기 정산을 끝낸 참여자들의 id.

**응답 `200`** — `["11", "12"]`

## POST /rooms/{shareCode}/settlement/complete

내 정산을 확정한다.

**요청** — `{ "memberId": "11" }`
**응답 `200`** — 갱신된 진행 목록

전원이 확정해야 최종 송금 리스트를 볼 수 있다.

### 최종 정산 계산 규칙 (FR-04 · FR-05)

프론트가 이렇게 계산한다. 서버가 계산을 맡게 되면 같은 규칙을 쓴다.

```
참여자별 결제액 = 그 사람이 결제자인 내역의 원화 환산 합
참여자별 부담액 = 그 사람의 PAYMENT_SHARE 원화 환산 합
             (아직 나누지 않은 항목은 `전체` 그룹이 N빵)
잔액 = 결제액 - 부담액   (양수면 받을 돈, 음수면 보낼 돈)
```

- **환산은 참여자별 금액 각각에 반올림**한다. 개인별 합과 총액이 1~2원 어긋나도
  보정하지 않고 화면에 드러내지도 않는다. 사용자가 실제로 보낼 숫자는 개인별 금액이다
- 송금은 받을 사람과 보낼 사람을 **큰 금액부터 맞물려** 만든다. 매번 한쪽 잔액이 0이 되므로
  **최대 (인원 − 1)건**이다. 모든 쌍의 채무를 나열하지 않는다
- 최종 송금 금액은 **원화로만** 보여준다. 외화는 근거 내역에만 남긴다

---

## ERD 보완 제안

화면을 그리는 데 필요하지만 제공된 ERD에 없는 것들이다. **백엔드에서 확정이 필요하다.**

### 1. `SETTLEMENT_ROOM.expires_at` (권장: 추가)

`created_at + 7일`이라 파생 가능하지만, **서버가 계산해 내려주기를 권한다.**
프론트가 파생하면 만료 판정이 클라이언트 시계에 의존해, 기기 시간이 틀어진 사용자에게
A-08(만료)이 잘못 뜨거나 뜨지 않는다. 지금은 응답에 `expiresAt`이 있다고 가정하고 구현했다.

### 2. `default_currency` 요청 필드 (선택)

방 생성 화면에 통화 선택 UI가 없어 프론트는 상수 `JPY`를 보낸다
(`src/constants/roomRules.ts`의 `DEFAULT_CURRENCY`).
서버 기본값으로 대체 가능하면 요청 필드에서 빼도 된다.

### 3. `PAYMENT.included_in_settlement` (필수)

FR-02 의 "등록된 결제 내역 중 정산에 포함할 항목을 선택" 을 담을 자리가 ERD 에 없다.
B-02 의 원형 체크가 이 값을 바꾼다. `boolean NOT NULL DEFAULT false` 를 권한다.

### 4. `RECEIPT_IMAGE` 테이블 + `PAYMENT.receipt_image_id` (필수)

C-05 는 결과를 **스크린샷별로 묶어** 보여주고(`스크린샷 1 · 3건`), 썸네일을 누르면
원본을 크게 띄운다. C-06 도 수정 화면에 원본을 함께 보여준다.
어떤 결제가 어느 스크린샷에서 나왔는지 모르면 이 화면들을 그릴 수 없다.

```
RECEIPT_IMAGE {
    bigint   id PK
    bigint   room_id FK
    bigint   uploaded_by_member_id FK
    varchar  url
    int      display_order
    datetime created_at
}
PAYMENT + receipt_image_id FK  "nullable, 직접 입력한 내역은 null"
```

### 5. `SETTLEMENT_MEMBER_RESULT` 에 받을/보낼 금액 (선택)

ERD 에는 `paid_krw` · `owed_krw` 만 있다. FR-05 가 요구하는 네 값 중
`받을 금액` · `보낼 금액` 은 두 값의 차이로 파생되므로 저장하지 않아도 된다.
지금 프론트는 파생해서 쓴다. 저장해두려면 컬럼을 더하면 된다.

### 6. 정산 진행 상태 (필수)

참여자마다 자기 정산을 확정하는 시각이 다르고, 전원이 끝나야 최종 송금 리스트가 열린다.
`SETTLEMENT` 에 방 단위 `status` 만 있어서 **누가 끝냈는지**를 담을 자리가 없다.

```
SETTLEMENT_MEMBER_RESULT + completed_at  datetime "nullable"
```

또는 별도 테이블로 둔다. 위 progress API 가 이 값을 읽는다.

### 7. 닉네임 선점 상태 — **의도적으로 만들지 않음**

`ROOM_MEMBER`에 claim 관련 컬럼이 없는 것은 설계 결정이다.
서버는 누가 어떤 닉네임을 가져갔는지 알지 않는다.

- A-06은 **모든 닉네임을 동등하게 선택 가능**하게 그린다 (`사용 중` 라벨 없음)
- 신원은 브라우저 `localStorage`에만 저장된다 (`oide:identity:{shareCode}`)
- B-01의 `n명 참여 중`은 **방에 등록된 인원 수**이지 접속자 수가 아니다

이 결정이 바뀌면 `ROOM_MEMBER.status`(`UNCLAIMED`/`CLAIMED`) 추가와
`POST /rooms/{roomId}/members/{memberId}/claim`(충돌 시 `409`)이 필요하다.

---

## 다음 범위에서 붙을 것

`src/types/payment.ts` · `src/types/settlement.ts`에 타입만 확정해두었다.
`SPLIT_GROUP.type`은 `ALL`/`CUSTOM`, `PAYMENT.split_method`는 `EQUAL`/`CUSTOM`,
`SETTLEMENT.status`는 `NOT_STARTED`/`IN_PROGRESS`/`DONE`/`OUTDATED`를 쓴다.

