package com.example.oide.global.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

class GlobalExceptionHandlerTest {

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc =
				MockMvcBuilders.standaloneSetup(new TestController())
						.setControllerAdvice(new GlobalExceptionHandler())
						.build();
	}

	@Test
	void returnsErrorCodeFromBusinessException() throws Exception {
		mockMvc
				.perform(get("/business-exception"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("COMMON_001"))
				.andExpect(jsonPath("$.message").value("잘못된 요청입니다."));
	}

	@Test
	void hidesDetailsOfUnexpectedException() throws Exception {
		mockMvc
				.perform(get("/unexpected-exception"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.code").value("COMMON_002"))
				.andExpect(jsonPath("$.message").value("서버 내부 오류가 발생했습니다."));
	}

	@RestController
	private static class TestController {

		@GetMapping("/business-exception")
		void throwBusinessException() {
			throw new BusinessException(ErrorCode.INVALID_REQUEST);
		}

		@GetMapping("/unexpected-exception")
		void throwUnexpectedException() {
			throw new IllegalStateException("sensitive exception details");
		}
	}
}
