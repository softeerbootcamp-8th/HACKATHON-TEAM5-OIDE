package com.example.oide.payment.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentOpenApiTest {

	@Autowired private MockMvc mockMvc;

	@Test
	void 결제_추출과_등록_API가_상세_명세에_포함된다() throws Exception {
		mockMvc
				.perform(get("/v3/api-docs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.tags[?(@.name == 'Payment Extraction')]").exists())
				.andExpect(jsonPath("$.tags[?(@.name == 'Payment')]").exists())
				.andExpect(
						jsonPath("$.paths['/api/rooms/{roomId}/payments/extractions'].post.summary")
								.value("결제 스크린샷 추출 시작"))
				.andExpect(
						jsonPath("$.paths['/api/rooms/{roomId}/payments/extractions'].post.responses['202']")
								.exists())
				.andExpect(
						jsonPath("$.paths['/api/rooms/{roomId}/payments/extractions'].post.responses['400']")
								.exists())
				.andExpect(
						jsonPath("$.paths['/api/rooms/{roomId}/payments/extractions'].post.responses['410']")
								.exists())
				.andExpect(
						jsonPath(
								"$.paths['/api/rooms/{roomId}/payments/extractions'].post.requestBody.content['multipart/form-data']")
								.exists())
				.andExpect(
						jsonPath("$.paths['/api/extractions/{jobId}'].get.summary")
								.value("결제 스크린샷 추출 상태 조회"))
				.andExpect(
						jsonPath("$.paths['/api/rooms/{roomId}/payments/bulk'].post.summary")
								.value("결제 내역 일괄 등록"))
				.andExpect(
						jsonPath("$.paths['/api/rooms/{roomId}/payments/bulk'].post.responses['201']")
								.exists())
				.andExpect(
						jsonPath("$.paths['/api/rooms/{roomId}/payments/bulk'].post.responses['410']")
								.exists())
				.andExpect(
						jsonPath("$.paths['/api/rooms/{roomId}/payments'].post.summary")
								.value("결제 내역 직접 등록"))
				.andExpect(
						jsonPath("$.paths['/api/rooms/{roomId}/payments'].get.summary")
								.value("정산방 결제 내역 조회"))
				.andExpect(jsonPath("$.components.schemas.ExtractedPayment.properties.reviewFlags.description").exists())
				.andExpect(jsonPath("$.components.schemas.ImageFailure.properties.reason.description").exists())
				.andExpect(jsonPath("$.components.schemas.PaymentRegisterRequest.properties.amount.example").value(3200));
	}
}
