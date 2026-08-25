package com.example.oide.global.currency;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.oide.global.exception.GlobalExceptionHandler;

@DisplayName("CurrencyController MockMvc 테스트")
class CurrencyControllerTest {

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc =
				MockMvcBuilders.standaloneSetup(new CurrencyController())
						.setControllerAdvice(new GlobalExceptionHandler())
						.build();
	}

	@Test
	@DisplayName("지원 통화 21개를 선언된 노출 순서대로 반환한다")
	void returnsSupportedCurrenciesInDisplayOrder() throws Exception {
		mockMvc
				.perform(get("/api/currencies"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(21))
				.andExpect(jsonPath("$[0].code").value("KRW"))
				.andExpect(jsonPath("$[0].name").value("원"))
				.andExpect(jsonPath("$[0].minorUnit").value(0))
				.andExpect(jsonPath("$[1].code").value("JPY"))
				.andExpect(jsonPath("$[3].code").value("CNY"))
				.andExpect(jsonPath("$[3].minorUnit").value(2))
				.andExpect(jsonPath("$[20].code").value("INR"));
	}
}
