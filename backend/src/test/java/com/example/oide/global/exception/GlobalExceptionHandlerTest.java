package com.example.oide.global.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
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

	@Test
	void 없는_경로는_404로_알린다() throws Exception {
		mockMvc
				.perform(get("/no-resource"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("COMMON_003"));
	}

	@Test
	void 지원하지_않는_메서드는_405로_알린다() throws Exception {
		mockMvc
				.perform(get("/method-not-supported"))
				.andExpect(status().isMethodNotAllowed())
				.andExpect(jsonPath("$.code").value("COMMON_004"));
	}

	@Test
	void 업로드_크기_초과는_스크린샷_크기_오류로_알린다() throws Exception {
		// 컨테이너가 애플리케이션 검증보다 먼저 거절하므로, 이 매핑이 없으면 서버 오류로 보인다.
		mockMvc
				.perform(get("/upload-too-large"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("PAYMENT_014"));
	}

	@Test
	void multipart가_아닌_요청은_업로드_없음으로_알린다() throws Exception {
		mockMvc
				.perform(get("/not-multipart"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("PAYMENT_011"));
	}

	@RestController
	private static class TestController {

		@GetMapping("/no-resource")
		void throwNoResourceFound() throws NoResourceFoundException {
			throw new NoResourceFoundException(HttpMethod.GET, "/no-resource", "no-resource");
		}

		@GetMapping("/method-not-supported")
		void throwMethodNotSupported() throws HttpRequestMethodNotSupportedException {
			throw new HttpRequestMethodNotSupportedException("DELETE");
		}

		@GetMapping("/upload-too-large")
		void throwUploadTooLarge() {
			throw new MaxUploadSizeExceededException(10L * 1024 * 1024);
		}

		@GetMapping("/not-multipart")
		void throwMultipart() {
			throw new MultipartException("Current request is not a multipart request");
		}

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
