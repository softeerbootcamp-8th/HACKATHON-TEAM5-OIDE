package com.example.oide.payment.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * 추출용 스레드풀.
 *
 * <p>잡 오케스트레이션과 실제 Gemini 호출을 서로 다른 풀에 둔다. 한 풀을 공유하면 오케스트레이션
 * 스레드가 자기 하위 작업의 완료를 기다리는 동안 풀을 점유해 교착이 생긴다.
 */
@Configuration
public class AsyncConfig {

	public static final String EXTRACTION_JOB_EXECUTOR = "extractionJobExecutor";
	public static final String GEMINI_CALL_EXECUTOR = "geminiCallExecutor";

	/** 동시에 진행할 수 있는 업로드 잡의 수. */
	private static final int CONCURRENT_JOBS = 4;

	/** Gemini 동시 호출 수. 레이트리밋 방어를 겸해 이 풀 크기가 곧 동시성 상한이다. */
	private static final int CONCURRENT_GEMINI_CALLS = 6;

	@Bean(EXTRACTION_JOB_EXECUTOR)
	public Executor extractionJobExecutor() {
		return newExecutor(CONCURRENT_JOBS, 50, "extract-job-");
	}

	@Bean(GEMINI_CALL_EXECUTOR)
	public Executor geminiCallExecutor() {
		return newExecutor(CONCURRENT_GEMINI_CALLS, 200, "gemini-call-");
	}

	private Executor newExecutor(int size, int queueCapacity, String threadNamePrefix) {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(size);
		executor.setMaxPoolSize(size);
		executor.setQueueCapacity(queueCapacity);
		executor.setThreadNamePrefix(threadNamePrefix);
		executor.initialize();
		return executor;
	}
}
