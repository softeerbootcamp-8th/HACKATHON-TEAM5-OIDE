package com.example.oide.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

/** Swagger UI(/swagger-ui.html)에 표시될 API 문서의 기본 정보를 정의한다. */
@Configuration
public class OpenApiConfig {

	@Bean
	public OpenAPI openApi() {
		return new OpenAPI()
				.info(
						new Info()
								.title("OIDE API")
								.description("정산방 생성/참여, 결제 등록, 정산 계산 API")
								.version("v1"));
	}
}
