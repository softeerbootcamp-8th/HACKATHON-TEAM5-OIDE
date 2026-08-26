package com.example.oide.payment.client.gemini;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.example.oide.payment.client.DateSource;
import com.example.oide.payment.client.RawTransaction;
import com.example.oide.payment.client.ReceiptExtractionException;
import com.example.oide.payment.client.ReceiptExtractor;
import com.example.oide.payment.client.ReceiptImage;
import com.example.oide.payment.client.TransactionCategory;
import com.example.oide.payment.client.TransactionDirection;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * Gemini {@code generateContent}로 스크린샷 한 장을 추출한다.
 *
 * <p>이미지 여러 장을 한 요청에 묶지 않고 장당 한 번씩 호출한다. 묶으면 모델이 화면 간 정보를
 * 섞고 어느 결과가 어느 이미지에서 나왔는지 추적할 수 없으며, 한 장이 실패하면 전부 잃는다.
 */
@Slf4j
public class GeminiReceiptExtractor implements ReceiptExtractor {

	private static final long RETRY_BASE_DELAY_MILLIS = 500L;

	private final RestClient restClient;
	private final ObjectMapper objectMapper;
	private final GeminiProperties properties;
	private final JsonNode responseSchema;

	public GeminiReceiptExtractor(
			RestClient restClient, ObjectMapper objectMapper, GeminiProperties properties) {
		this.restClient = restClient;
		this.objectMapper = objectMapper;
		this.properties = properties;
		this.responseSchema = readSchema(objectMapper);
	}

	@Override
	public List<RawTransaction> extract(ReceiptImage image) {
		Map<String, Object> body = buildRequestBody(image);
		RuntimeException lastFailure = null;

		for (int attempt = 0; attempt <= properties.maxRetries(); attempt++) {
			try {
				String responseText = extractText(call(body));
				return parseTransactions(responseText);
			} catch (RetryableGeminiException exception) {
				lastFailure = exception;
				log.warn(
						"Gemini 호출 재시도 attempt={}/{} reason={}",
						attempt + 1,
						properties.maxRetries() + 1,
						exception.getMessage());
				sleepBeforeRetry(attempt);
			}
		}
		throw new ReceiptExtractionException("Gemini 추출에 반복 실패했다", lastFailure);
	}

	private String call(Map<String, Object> body) {
		String path = "/v1beta/models/%s:generateContent".formatted(properties.model());
		try {
			return restClient
					.post()
					.uri(path)
					.header("x-goog-api-key", properties.apiKey())
					.body(body)
					.retrieve()
					.body(String.class);
		} catch (RestClientResponseException exception) {
			int status = exception.getStatusCode().value();
			// 429(레이트리밋)와 5xx만 재시도한다. 4xx는 요청 자체가 잘못된 것이라 재시도해도 같다.
			if (status == 429 || status >= 500) {
				throw new RetryableGeminiException("HTTP " + status, exception);
			}
			throw new ReceiptExtractionException("Gemini가 HTTP %d를 반환했다".formatted(status), exception);
		} catch (Exception exception) {
			throw new RetryableGeminiException("Gemini 호출 실패: " + exception.getMessage(), exception);
		}
	}

	private Map<String, Object> buildRequestBody(ReceiptImage image) {
		Map<String, Object> inlineData = Map.of(
				"mimeType", image.mimeType(),
				"data", Base64.getEncoder().encodeToString(image.data()));

		// generationConfig는 순서가 의미 없지만 읽는 사람을 위해 삽입 순서를 유지한다.
		Map<String, Object> generationConfig = new LinkedHashMap<>();
		generationConfig.put("responseMimeType", "application/json");
		generationConfig.put("responseSchema", responseSchema);
		generationConfig.put("thinkingConfig", Map.of("thinkingLevel", properties.thinkingLevel()));
		generationConfig.put("mediaResolution", properties.mediaResolution());
		// temperature/topP/topK는 일부러 넣지 않는다.
		// Gemini 3.x는 기본값에 맞춰 튜닝되어 있어 직접 지정하면 오히려 품질이 떨어진다.

		return Map.of(
				"systemInstruction",
						Map.of("parts", List.of(Map.of("text", ReceiptExtractionPrompt.SYSTEM_INSTRUCTION))),
				"contents", List.of(Map.of("parts", List.of(Map.of("inlineData", inlineData)))),
				"generationConfig", generationConfig);
	}

	private String extractText(String rawResponse) {
		try {
			JsonNode root = objectMapper.readTree(rawResponse);
			JsonNode candidates = root.path("candidates");
			if (!candidates.isArray() || candidates.isEmpty()) {
				// 안전 필터에 걸리거나 프롬프트가 차단되면 candidates가 비어서 온다.
				throw new ReceiptExtractionException(
						"Gemini 응답에 candidate가 없다: " + root.path("promptFeedback"), null);
			}
			JsonNode candidate = candidates.get(0);
			String finishReason = candidate.path("finishReason").asString("");
			if ("MAX_TOKENS".equals(finishReason)) {
				throw new ReceiptExtractionException("응답이 출력 토큰 한도에서 잘렸다", null);
			}
			StringBuilder text = new StringBuilder();
			for (JsonNode part : candidate.path("content").path("parts")) {
				text.append(part.path("text").asString(""));
			}
			return text.toString();
		} catch (ReceiptExtractionException exception) {
			throw exception;
		} catch (Exception exception) {
			throw new RetryableGeminiException("Gemini 응답을 읽지 못했다", exception);
		}
	}

	private List<RawTransaction> parseTransactions(String json) {
		JsonNode root;
		try {
			root = objectMapper.readTree(json);
		} catch (Exception exception) {
			// responseSchema를 줬는데도 스키마를 벗어난 경우다. 한 번 더 시도해볼 가치가 있다.
			throw new RetryableGeminiException("응답이 JSON이 아니다", exception);
		}

		List<RawTransaction> transactions = new ArrayList<>();
		for (JsonNode node : root.path("transactions")) {
			transactions.add(toTransaction(node));
		}
		return transactions;
	}

	private RawTransaction toTransaction(JsonNode node) {
		return new RawTransaction(
				text(node, "merchant"),
				text(node, "amount"),
				text(node, "currency"),
				text(node, "date"),
				enumValue(node, "dateSource", DateSource.class, DateSource.NONE),
				text(node, "time"),
				enumValue(node, "direction", TransactionDirection.class, TransactionDirection.OUT),
				enumValue(node, "category", TransactionCategory.class, TransactionCategory.OTHER),
				node.path("partial").asBoolean(false));
	}

	private static String text(JsonNode node, String field) {
		JsonNode value = node.path(field);
		if (value.isMissingNode() || value.isNull()) {
			return null;
		}
		String result = value.asString().trim();
		return result.isEmpty() ? null : result;
	}

	private static <E extends Enum<E>> E enumValue(
			JsonNode node, String field, Class<E> type, E fallback) {
		String value = text(node, field);
		if (value == null) {
			return fallback;
		}
		try {
			return Enum.valueOf(type, value.toUpperCase());
		} catch (IllegalArgumentException exception) {
			return fallback;
		}
	}

	private void sleepBeforeRetry(int attempt) {
		try {
			Thread.sleep(RETRY_BASE_DELAY_MILLIS << attempt);
		} catch (InterruptedException interrupted) {
			Thread.currentThread().interrupt();
			throw new ReceiptExtractionException("추출 재시도 대기 중 인터럽트됐다", interrupted);
		}
	}

	private static JsonNode readSchema(ObjectMapper objectMapper) {
		try {
			return objectMapper.readTree(ReceiptExtractionPrompt.RESPONSE_SCHEMA);
		} catch (Exception exception) {
			throw new IllegalStateException("응답 스키마가 잘못된 JSON이다", exception);
		}
	}

	/** 재시도하면 성공할 수 있는 실패. 이 클래스 밖으로 나가지 않는다. */
	static class RetryableGeminiException extends RuntimeException {
		RetryableGeminiException(String message, Throwable cause) {
			super(message, cause);
		}
	}
}
