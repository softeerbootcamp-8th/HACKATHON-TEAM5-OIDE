package com.example.oide.payment.client.gemini;

/**
 * 추출용 시스템 지시문과 응답 스키마.
 *
 * <p>규칙을 앱별로 분기하지 않고 "있으면 A, 없으면 B" 형태의 조건부 우선순위로 쓴 것이 핵심이다.
 * 토스·계좌 내역·카드 이용내역은 날짜 위치도, 연도 표기도, 잔액 유무도 서로 다르지만, 아래 규칙은
 * 화면 종류를 묻지 않고 각 화면에서 맞는 가지를 탄다. 앱마다 규칙을 늘리면 프롬프트가 길어져
 * flash-lite가 규칙을 흘리기 시작하고, 처음 보는 은행 앱에서 곧바로 깨진다.
 */
final class ReceiptExtractionPrompt {

	static final String SYSTEM_INSTRUCTION =
			"""
			너는 결제 내역 스크린샷에서 거래 목록을 읽어내는 추출기다.
			화면에 실제로 보이는 것만 옮긴다. 추론하거나 지어내지 않는다.
			확실하지 않은 값은 반드시 null로 둔다. 잘못된 값보다 빈 값이 낫다.

			[날짜]
			1. 거래 행 자체에 날짜가 있으면 그것을 쓰고 dateSource=ROW.
			2. 없으면 그 행 위쪽에서 가장 가까운 날짜 구분 헤더의 날짜를 쓰고 dateSource=HEADER.
			3. 그것도 없으면 date=null, dateSource=NONE.
			화면에 연도가 함께 보일 때만 yyyy-MM-dd로 적는다. 연도가 없으면 MM-DD로만 적는다.
			연도를 짐작해서 채우지 마라.

			[시각]
			행에 보이는 시각을 HH:mm 또는 HH:mm:ss로 적는다. 없으면 null.

			[금액]
			행에서 오른쪽에 정렬된, 가장 크고 진한 숫자가 거래 금액이다.
			그 바로 아래에 더 작고 흐린 숫자가 있으면 그것은 계좌 잔액이므로 절대 금액으로 쓰지 마라.
			금액은 통화 기호와 콤마와 부호를 모두 뺀 숫자 문자열로 적는다. (예: "-7,700원" -> "7700")
			소수점이 있으면 유지한다. (예: "$3.50" -> "3.50")

			[통화]
			ISO 4217 코드로 적는다. "원"과 "₩"는 KRW, "¥"는 JPY, "€"는 EUR로 본다.
			"$"처럼 여러 통화가 쓰는 기호는 어느 나라 통화인지 화면에서 확신할 수 없으면 null로 둔다.

			[방향과 성격]
			지출/출금이면 direction=OUT, 입금이면 IN.
			category는 실제 결제면 PAYMENT, 계좌 이체면 TRANSFER, 충전이면 TOPUP,
			대출이자 같은 이자면 INTEREST, 나머지는 OTHER.

			[잘린 행]
			화면 위아래 경계에서 일부만 보이는 행은 partial=true로 표시하되 읽을 수 있는 값은 채운다.

			거래가 하나도 없으면 빈 배열을 반환한다.
			""";

	/** Gemini responseSchema (OpenAPI 서브셋). 이 스키마 덕분에 응답에서 JSON을 긁어내는 코드가 필요 없다. */
	static final String RESPONSE_SCHEMA =
			"""
			{
			  "type": "object",
			  "properties": {
			    "transactions": {
			      "type": "array",
			      "items": {
			        "type": "object",
			        "properties": {
			          "merchant":   { "type": "string", "nullable": true },
			          "amount":     { "type": "string" },
			          "currency":   { "type": "string", "nullable": true },
			          "date":       { "type": "string", "nullable": true },
			          "dateSource": { "type": "string", "enum": ["ROW", "HEADER", "NONE"] },
			          "time":       { "type": "string", "nullable": true },
			          "direction":  { "type": "string", "enum": ["OUT", "IN"] },
			          "category":   { "type": "string", "enum": ["PAYMENT", "TRANSFER", "TOPUP", "INTEREST", "OTHER"] },
			          "partial":    { "type": "boolean" }
			        },
			        "required": ["amount", "dateSource", "direction", "category", "partial"],
			        "propertyOrdering": ["merchant", "amount", "currency", "date", "dateSource", "time", "direction", "category", "partial"]
			      }
			    }
			  },
			  "required": ["transactions"]
			}
			""";

	private ReceiptExtractionPrompt() {}
}
