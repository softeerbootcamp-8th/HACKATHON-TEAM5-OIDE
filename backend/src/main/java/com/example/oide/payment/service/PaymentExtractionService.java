package com.example.oide.payment.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.oide.payment.client.RawTransaction;
import com.example.oide.payment.client.ReceiptExtractionException;
import com.example.oide.payment.client.ReceiptExtractor;
import com.example.oide.payment.client.ReceiptImage;
import com.example.oide.payment.config.AsyncConfig;
import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.room.service.RoomAccessService;
import com.example.oide.room.domain.SettlementRoom;

import lombok.extern.slf4j.Slf4j;

/** 스크린샷 업로드를 받아 백그라운드 추출을 시작하고, 진행 상황을 조회할 수 있게 한다. */
@Slf4j
@Service
public class PaymentExtractionService {

	/** FR-02: 한 번에 최대 20장. */
	private static final int MAX_SCREENSHOTS = 20;

	private static final Set<String> ALLOWED_MIME_TYPES =
			Set.of("image/jpeg", "image/png", "image/webp");

	private final ReceiptExtractor receiptExtractor;
	private final ExtractionPostProcessor postProcessor;
	private final ExtractionJobStore jobStore;
	private final RoomAccessService roomAccessService;
	private final Executor jobExecutor;
	private final Executor geminiExecutor;

	public PaymentExtractionService(
			ReceiptExtractor receiptExtractor,
			ExtractionPostProcessor postProcessor,
			ExtractionJobStore jobStore,
			RoomAccessService roomAccessService,
			@Qualifier(AsyncConfig.EXTRACTION_JOB_EXECUTOR) Executor jobExecutor,
			@Qualifier(AsyncConfig.GEMINI_CALL_EXECUTOR) Executor geminiExecutor) {
		this.receiptExtractor = receiptExtractor;
		this.postProcessor = postProcessor;
		this.jobStore = jobStore;
		this.roomAccessService = roomAccessService;
		this.jobExecutor = jobExecutor;
		this.geminiExecutor = geminiExecutor;
	}

	public ExtractionJob start(Long roomId, List<MultipartFile> files) {
		SettlementRoom room = roomAccessService.getActiveRoom(roomId);
		RoomContext context = RoomContext.from(room);

		// MultipartFile은 요청이 끝나면 읽을 수 없으므로 바이트를 지금 확보한다.
		List<ReceiptImage> images = readImages(files);

		ExtractionJob job = jobStore.save(new ExtractionJob(context.roomId(), images.size()));
		jobExecutor.execute(() -> runJob(job, context, images));
		return job;
	}

	public ExtractionJob getJob(String jobId) {
		return jobStore
				.find(jobId)
				.orElseThrow(() -> new BusinessException(ErrorCode.EXTRACTION_JOB_NOT_FOUND));
	}

	private void runJob(ExtractionJob job, RoomContext context, List<ReceiptImage> images) {
		List<CompletableFuture<Void>> futures = new ArrayList<>(images.size());
		for (int index = 0; index < images.size(); index++) {
			int imageIndex = index;
			ReceiptImage image = images.get(index);
			futures.add(
					CompletableFuture.runAsync(
							() -> extractOne(job, context, image, imageIndex), geminiExecutor));
		}
		CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).join();

		// 중복 판정은 모든 이미지를 본 뒤에만 가능하다. 스크롤 캡처는 이미지 경계를 넘어 겹친다.
		job.replaceItems(postProcessor.markDuplicates(job.items()));
	}

	private void extractOne(
			ExtractionJob job, RoomContext context, ReceiptImage image, int imageIndex) {
		// 한 장이 실패해도 나머지는 그대로 내려준다. 20장 중 3장 실패로 전부 잃는 쪽이 훨씬 나쁘다.
		// 실패 사유는 타입으로만 알리고, 진단에 필요한 예외 내용은 로그에만 남긴다.
		try {
			List<RawTransaction> raw = receiptExtractor.extract(image);
			job.addResult(postProcessor.process(raw, context, imageIndex, image.originalFilename()));
		} catch (ReceiptExtractionException exception) {
			log.warn("스크린샷 추출 실패 index={} file={}", imageIndex, image.originalFilename(), exception);
			job.addFailure(failure(image, imageIndex, ExtractionFailureReason.EXTRACTION_FAILED));
		} catch (RuntimeException exception) {
			log.error("스크린샷 처리 중 예상하지 못한 오류 index={} file={}", imageIndex, image.originalFilename(), exception);
			job.addFailure(failure(image, imageIndex, ExtractionFailureReason.UNEXPECTED_ERROR));
		}
	}

	private static ImageFailure failure(
			ReceiptImage image, int imageIndex, ExtractionFailureReason reason) {
		return new ImageFailure(imageIndex, image.originalFilename(), reason);
	}

	private List<ReceiptImage> readImages(List<MultipartFile> files) {
		if (files == null || files.isEmpty()) {
			throw new BusinessException(ErrorCode.NO_SCREENSHOT_UPLOADED);
		}
		// 초과분을 조용히 버리면 사용자는 왜 빠졌는지 알 수 없다. 명시적으로 거절한다.
		if (files.size() > MAX_SCREENSHOTS) {
			throw new BusinessException(ErrorCode.TOO_MANY_SCREENSHOTS);
		}

		List<ReceiptImage> images = new ArrayList<>(files.size());
		for (MultipartFile file : files) {
			if (file.isEmpty()) {
				throw new BusinessException(ErrorCode.NO_SCREENSHOT_UPLOADED);
			}
			String mimeType = file.getContentType();
			if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType.toLowerCase())) {
				throw new BusinessException(ErrorCode.UNSUPPORTED_IMAGE_TYPE);
			}
			try {
				images.add(
						new ReceiptImage(file.getBytes(), mimeType.toLowerCase(), file.getOriginalFilename()));
			} catch (IOException exception) {
				throw new BusinessException(ErrorCode.NO_SCREENSHOT_UPLOADED);
			}
		}
		return images;
	}
}
