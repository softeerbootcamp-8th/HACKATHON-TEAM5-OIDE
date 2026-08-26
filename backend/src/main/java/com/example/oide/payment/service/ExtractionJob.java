package com.example.oide.payment.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * 진행 중인 추출 작업. 여러 스레드가 이미지별 결과를 밀어 넣고 폴링 요청이 동시에 읽으므로
 * 상태 변경은 전부 동기화한다.
 */
public class ExtractionJob {

	private final String id = UUID.randomUUID().toString();
	private final Long roomId;
	private final int totalImages;
	private final LocalDateTime createdAt = LocalDateTime.now();

	private final List<ExtractedPayment> items = new ArrayList<>();
	private final List<ImageFailure> failures = new ArrayList<>();
	private int finishedImages;

	public ExtractionJob(Long roomId, int totalImages) {
		this.roomId = roomId;
		this.totalImages = totalImages;
	}

	public synchronized void addResult(List<ExtractedPayment> extracted) {
		items.addAll(extracted);
		finishedImages++;
	}

	public synchronized void addFailure(ImageFailure failure) {
		failures.add(failure);
		finishedImages++;
	}

	/** 중복 표시처럼 전체 결과를 한 번에 다시 쓰는 후처리용. */
	public synchronized void replaceItems(List<ExtractedPayment> replacement) {
		items.clear();
		items.addAll(replacement);
	}

	public synchronized ExtractionStatus status() {
		return finishedImages >= totalImages ? ExtractionStatus.COMPLETED : ExtractionStatus.RUNNING;
	}

	public synchronized List<ExtractedPayment> items() {
		return Collections.unmodifiableList(new ArrayList<>(items));
	}

	public synchronized List<ImageFailure> failures() {
		return Collections.unmodifiableList(new ArrayList<>(failures));
	}

	public synchronized int finishedImages() {
		return finishedImages;
	}

	public String id() {
		return id;
	}

	public Long roomId() {
		return roomId;
	}

	public int totalImages() {
		return totalImages;
	}

	public LocalDateTime createdAt() {
		return createdAt;
	}
}
