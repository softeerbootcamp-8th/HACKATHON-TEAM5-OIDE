package com.example.oide.payment.client.gemini;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param apiKey 서버 환경변수 GEMINI_API_KEY로 주입한다. 비어 있으면 스텁 추출기가 대신 등록된다
 * @param model 모델 ID. 교체 가능하도록 설정으로 뺀다
 * @param mediaResolution 이미지 토큰 할당. HIGH는 장당 1120토큰, MEDIUM은 560토큰이다
 * @param thinkingLevel flash-lite 기본값이 minimal이지만 의존하지 않고 명시한다
 */
@ConfigurationProperties(prefix = "oide.gemini")
public record GeminiProperties(
		String apiKey,
		String baseUrl,
		String model,
		String mediaResolution,
		String thinkingLevel,
		Duration timeout,
		int maxRetries) {

	public GeminiProperties {
		baseUrl = (baseUrl == null || baseUrl.isBlank())
				? "https://generativelanguage.googleapis.com"
				: baseUrl;
		model = (model == null || model.isBlank()) ? "gemini-3.5-flash-lite" : model;
		mediaResolution = (mediaResolution == null || mediaResolution.isBlank())
				? "MEDIA_RESOLUTION_HIGH"
				: mediaResolution;
		thinkingLevel = (thinkingLevel == null || thinkingLevel.isBlank()) ? "minimal" : thinkingLevel;
		timeout = (timeout == null) ? Duration.ofSeconds(60) : timeout;
		maxRetries = (maxRetries <= 0) ? 2 : maxRetries;
	}

	public boolean hasApiKey() {
		return apiKey != null && !apiKey.isBlank();
	}
}
