package com.example.oide.global.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;

/** Swagger UI(/swagger-ui.html)에 표시될 API 문서의 기본 정보를 정의한다. */
@Configuration
public class OpenApiConfig {

	@Bean
	public OpenAPI openApi(@Value("${app.public-base-url:}") String publicBaseUrl) {
		OpenAPI openApi =
				new OpenAPI()
						.info(
								new Info()
										.title("OIDE API")
										.description("정산방 생성/참여, 결제 등록, 정산 계산 API")
										.version("v1"));

		// CloudFront가 EC2로 http로 요청을 넘겨서 springdoc이 서버 URL을 http로 잘못
		// 추론한다. 배포 환경의 공개 도메인을 고정해 Swagger UI의 Try it out이 https로 나가게 한다.
		if (!publicBaseUrl.isBlank()) {
			openApi.servers(List.of(new Server().url(publicBaseUrl)));
		}

		return openApi;
	}
}
