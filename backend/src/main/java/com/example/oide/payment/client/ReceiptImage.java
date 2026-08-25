package com.example.oide.payment.client;

/**
 * 추출 대상 이미지 한 장.
 *
 * <p>원본은 저장하지 않는다. 정산방이 7일 뒤 삭제되는데 파일만 따로 남으면 별도 정리가 필요하고,
 * 요구사항에도 보관 근거가 없다. 요청 처리 중에만 메모리에 들고 있다가 버린다.
 */
public record ReceiptImage(byte[] data, String mimeType, String originalFilename) {}
