package com.example.oide.payment.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * 추출 잡을 담아두는 인메모리 저장소.
 *
 * <p>DB 테이블을 쓰지 않는 이유는 배포가 단일 인스턴스이기 때문이다. jar 하나를 서버 한 대에
 * 올리고 systemd로 재시작하는 구조라, 테이블이 주는 이점(인스턴스 간 공유, 재기동 생존)이 지금은
 * 값어치가 없다. 잡은 수 분이면 끝나고 결과는 확정 등록 시점에 DB로 넘어간다.
 *
 * <p>인스턴스를 늘리거나 세션을 넘겨 이어 편집해야 할 때는 이 클래스만 DB 구현으로 갈아 끼운다.
 */
@Component
public class ExtractionJobStore {

	private static final Duration TTL = Duration.ofMinutes(30);

	private final Map<String, ExtractionJob> jobs = new ConcurrentHashMap<>();

	public ExtractionJob save(ExtractionJob job) {
		purgeExpired();
		jobs.put(job.id(), job);
		return job;
	}

	public Optional<ExtractionJob> find(String jobId) {
		purgeExpired();
		return Optional.ofNullable(jobs.get(jobId));
	}

	/** 별도 스케줄러를 두지 않고 접근할 때 정리한다. 잡 수가 적어 순회 비용이 문제되지 않는다. */
	private void purgeExpired() {
		LocalDateTime deadline = LocalDateTime.now().minus(TTL);
		jobs.values().removeIf(job -> job.createdAt().isBefore(deadline));
	}
}
