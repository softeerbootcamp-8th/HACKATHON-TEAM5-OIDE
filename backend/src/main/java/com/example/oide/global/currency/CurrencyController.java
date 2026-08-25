package com.example.oide.global.currency;

import java.util.Arrays;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

/** 통화 선택 화면이 사용할 지원 통화 목록을 노출하는 컨트롤러. */
@Tag(name = "Currency", description = "지원 통화 조회 API")
@RestController
@RequestMapping("/api/currencies")
public class CurrencyController {

	/** 지원 통화를 화면 노출 순서(KRW가 최상단)대로 반환한다. */
	@Operation(summary = "지원 통화 목록 조회", description = "결제 등록에 사용할 수 있는 통화를 노출 순서대로 반환한다.")
	@ApiResponses(@ApiResponse(responseCode = "200", description = "조회 성공"))
	@GetMapping
	public ResponseEntity<List<CurrencyResponse>> getCurrencies() {
		List<CurrencyResponse> currencies =
				Arrays.stream(SupportedCurrency.values()).map(CurrencyResponse::from).toList();
		return ResponseEntity.ok(currencies);
	}
}
