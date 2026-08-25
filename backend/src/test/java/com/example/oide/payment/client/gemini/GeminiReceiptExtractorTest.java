package com.example.oide.payment.client.gemini;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Duration;
import java.util.Base64;
import java.util.List;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.example.oide.payment.client.DateSource;
import com.example.oide.payment.client.RawTransaction;
import com.example.oide.payment.client.ReceiptImage;
import com.example.oide.payment.client.TransactionCategory;

import tools.jackson.databind.json.JsonMapper;

/**
 * Gemini REST 계약을 고정한다.
 *
 * <p>파라미터 이름이 하나만 틀려도 API가 조용히 무시하거나 400을 내는데, 실제 호출 없이는 알 수
 * 없다. 특히 Gemini 3.x에서 thinking_budget이 thinkingConfig.thinkingLevel로 바뀌었고
 * temperature는 지정하지 않는 것이 권장이라, 그 두 가지를 여기서 못 박아 둔다.
 */
class GeminiReceiptExtractorTest {

	private static final String RESPONSE_BODY =
			"""
			{
			  "candidates": [{
			    "finishReason": "STOP",
			    "content": { "parts": [{ "text": "{\\"transactions\\":[{\\"merchant\\":\\"궁민김밥 (구)김밥천국\\",\\"amount\\":\\"5000\\",\\"currency\\":\\"KRW\\",\\"date\\":\\"08-19\\",\\"dateSource\\":\\"HEADER\\",\\"time\\":\\"08:56\\",\\"direction\\":\\"OUT\\",\\"category\\":\\"PAYMENT\\",\\"partial\\":false}]}" }] }
			  }]
			}
			""";

	private RestClient.Builder builder;
	private MockRestServiceServer server;
	private GeminiReceiptExtractor extractor;

	@BeforeEach
	void setUp() {
		builder = RestClient.builder().baseUrl("https://generativelanguage.googleapis.com");
		server = MockRestServiceServer.bindTo(builder).build();
		GeminiProperties properties =
				new GeminiProperties(
						"test-key", null, "gemini-3.5-flash-lite", null, null, Duration.ofSeconds(5), 2);
		extractor = new GeminiReceiptExtractor(builder.build(), JsonMapper.builder().build(), properties);
	}

	@Test
	void Gemini_3_규격에_맞는_요청을_보낸다() {
		server
				.expect(requestTo(
						"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
				.andExpect(method(HttpMethod.POST))
				.andExpect(header("x-goog-api-key", "test-key"))
				.andExpect(jsonPath("$.generationConfig.responseMimeType").value("application/json"))
				.andExpect(jsonPath("$.generationConfig.responseSchema").exists())
				.andExpect(jsonPath("$.generationConfig.thinkingConfig.thinkingLevel").value("minimal"))
				.andExpect(jsonPath("$.generationConfig.mediaResolution").value("MEDIA_RESOLUTION_HIGH"))
				// Gemini 3.x는 기본값에 맞춰 튜닝되어 있어 샘플링 파라미터를 지정하지 않는 것이 권장이다.
				.andExpect(jsonPath("$.generationConfig.temperature").doesNotExist())
				.andExpect(jsonPath("$.generationConfig.topP").doesNotExist())
				.andExpect(jsonPath("$.contents[0].parts[0].inlineData.mimeType").value("image/jpeg"))
				.andExpect(
						jsonPath("$.contents[0].parts[0].inlineData.data")
								.value(Base64.getEncoder().encodeToString(new byte[] {1, 2, 3})))
				.andExpect(jsonPath("$.systemInstruction.parts[0].text").exists())
				.andRespond(withSuccess(RESPONSE_BODY, MediaType.APPLICATION_JSON));

		extractor.extract(image());

		server.verify();
	}

	@Test
	void 응답을_거래_목록으로_읽는다() {
		server.expect(requestTo(Matchers.containsString("generateContent")))
				.andRespond(withSuccess(RESPONSE_BODY, MediaType.APPLICATION_JSON));

		List<RawTransaction> transactions = extractor.extract(image());

		assertThat(transactions).hasSize(1);
		RawTransaction transaction = transactions.getFirst();
		assertThat(transaction.merchant()).isEqualTo("궁민김밥 (구)김밥천국");
		assertThat(transaction.amount()).isEqualTo("5000");
		assertThat(transaction.date()).isEqualTo("08-19");
		assertThat(transaction.dateSource()).isEqualTo(DateSource.HEADER);
		assertThat(transaction.category()).isEqualTo(TransactionCategory.PAYMENT);
		assertThat(transaction.partial()).isFalse();
	}

	@Test
	void 서버_오류는_재시도한다() {
		server
				.expect(ExpectedCount.once(), requestTo(Matchers.containsString("generateContent")))
				.andRespond(withServerError());
		server
				.expect(ExpectedCount.once(), requestTo(Matchers.containsString("generateContent")))
				.andRespond(withSuccess(RESPONSE_BODY, MediaType.APPLICATION_JSON));

		assertThat(extractor.extract(image())).hasSize(1);

		server.verify();
	}

	private static ReceiptImage image() {
		return new ReceiptImage(new byte[] {1, 2, 3}, "image/jpeg", "screenshot.jpg");
	}
}
