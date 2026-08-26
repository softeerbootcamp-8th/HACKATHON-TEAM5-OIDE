package com.example.oide.payment.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import com.example.oide.payment.client.ReceiptExtractor;
import com.example.oide.payment.client.gemini.GeminiProperties;
import com.example.oide.payment.client.gemini.GeminiReceiptExtractor;
import tools.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableConfigurationProperties(GeminiProperties.class)
public class GeminiConfig {

	private static final int CONNECT_TIMEOUT_MILLIS = 10_000;

	/**
	 * 키가 없으면 기동을 중단한다.
	 *
	 * <p>가짜 결제 내역을 돌려주는 대체 구현을 두면, 키가 잘못 설정된 채로도 앱이 정상처럼 떠서
	 * 존재하지 않는 결제가 정산에 섞인다. 정산 결과가 틀리는 것보다 뜨지 않는 편이 낫다.
	 */
	@Bean
	public ReceiptExtractor receiptExtractor(GeminiProperties properties, ObjectMapper objectMapper) {
		if (!properties.hasApiKey()) {
			throw new IllegalStateException(
					"GEMINI_API_KEY가 설정되지 않았다. 결제 스크린샷을 추출할 수 없으므로 기동하지 않는다.");
		}
		log.info("Gemini 추출기를 등록한다. model={}", properties.model());
		return new GeminiReceiptExtractor(geminiRestClient(properties), objectMapper, properties);
	}

	private RestClient geminiRestClient(GeminiProperties properties) {
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
		factory.setReadTimeout((int) properties.timeout().toMillis());
		return RestClient.builder()
				.baseUrl(properties.baseUrl())
				.requestFactory(factory)
				.build();
	}
}
