package com.example.oide.payment.client;

import java.util.List;

/**
 * 결제 스크린샷 한 장에서 거래 목록을 읽어낸다.
 *
 * <p>인터페이스로 분리해 두면 테스트에서 실제 호출 없이 흐름을 검증할 수 있고, 모델을 바꿀 때
 * 구현체 하나를 교체하는 것으로 끝난다.
 */
public interface ReceiptExtractor {

	List<RawTransaction> extract(ReceiptImage image);
}
