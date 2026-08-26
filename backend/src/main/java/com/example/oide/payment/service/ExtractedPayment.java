package com.example.oide.payment.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import com.example.oide.payment.client.TransactionCategory;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 후처리까지 끝난 추출 결과 한 건. 아직 저장되지 않았고, 사용자가 수정·선택한 뒤에야 결제 내역이 된다.
 *
 * @param id 프론트가 항목을 식별하고 수정 상태를 붙들기 위한 임시 키
 * @param selected 기본 선택 여부. 결제로 보이고 잘리지 않은 행만 기본 선택한다
 */
@Schema(description = "후처리까지 끝난 결제 스크린샷 추출 결과. 아직 저장된 결제 내역은 아니다.")
public record ExtractedPayment(
			@Schema(description = "사용자가 결과를 수정·선택할 때 사용하는 임시 ID", example = "9ce82d8a-500e-4cb5-a8cd-ef2a05e5e317")
					String id,
			@Schema(description = "업로드한 파일 목록에서의 0 기반 이미지 순서", example = "0") int imageIndex,
			@Schema(description = "원본 파일명", example = "payment-01.png") String sourceFilename,
			@Schema(description = "추출한 결제처", example = "이치란 라멘", nullable = true) String merchant,
			@Schema(description = "원 통화 단위 금액", example = "3200") BigDecimal amount,
			@Schema(description = "추출하거나 방 기본값으로 보정한 ISO 4217 통화 코드", example = "JPY")
					String currency,
			@Schema(
					description = "추출·보정한 결제 시각. 날짜를 찾지 못하면 null",
					example = "2026-08-21T20:14:00",
					nullable = true)
					LocalDateTime paidAt,
			@Schema(description = "화면에서 분류한 거래 성격") TransactionCategory category,
			@Schema(description = "기본 등록 선택 여부. 정상 출금 결제이며 잘린 행이 아니면 true", example = "true")
					boolean selected,
			@Schema(description = "사용자가 확인해야 하는 추론·누락·중복 정보") Set<ReviewFlag> reviewFlags) {

	ExtractedPayment deselectAs(ReviewFlag flag) {
		Set<ReviewFlag> flags = new LinkedHashSet<>(reviewFlags);
		flags.add(flag);
		return new ExtractedPayment(
				id, imageIndex, sourceFilename, merchant, amount, currency, paidAt, category, false, flags);
	}
}
