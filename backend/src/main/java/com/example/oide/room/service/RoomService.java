package com.example.oide.room.service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.global.util.RoomExpirationValidator;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.dto.RoomCreateRequest;
import com.example.oide.room.dto.RoomResponse;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;

import lombok.RequiredArgsConstructor;

/**
 * 정산방 생성과 조회 유스케이스를 담당하는 서비스.
 * 입력 검증, share_code 발급, 방+멤버 저장을 하나의 트랜잭션으로 묶는다.
 */
@Service
@RequiredArgsConstructor
public class RoomService {

	// 방 생성 시 통화 선택 UI가 없어 KRW로 고정한다(#18 코멘트 결정 사항).
	private static final String DEFAULT_CURRENCY = "KRW";
	private static final int MAX_TITLE_LENGTH = 10;
	private static final int MIN_MEMBER_COUNT = 2;
	private static final int MAX_NICKNAME_LENGTH = 10;
	// share_code는 공유 링크에 그대로 노출되므로 짧게 유지한다: 소문자+숫자 6자리.
	private static final String SHARE_CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
	private static final int SHARE_CODE_LENGTH = 6;
	private static final int MAX_SHARE_CODE_ATTEMPTS = 5;

	private final SettlementRoomRepository settlementRoomRepository;
	private final RoomMemberRepository roomMemberRepository;
	private final SecureRandom secureRandom = new SecureRandom();

	/**
	 * 정산방을 생성한다.
	 * 1) 방 이름/닉네임 목록을 검증하고 2) 충돌하지 않는 share_code를 발급한 뒤
	 * 3) 방과 참여자를 함께 저장해 하나의 응답으로 반환한다.
	 */
	@Transactional
	public RoomResponse createRoom(RoomCreateRequest request) {
		validateTitle(request.title());
		validateNicknames(request.nicknames());

		SettlementRoom room = new SettlementRoom(generateShareCode(), request.title(), DEFAULT_CURRENCY);
		settlementRoomRepository.save(room);

		// 요청에 담긴 닉네임 순서를 그대로 참여자 표시 순서(displayOrder)로 사용한다.
		List<RoomMember> members = new ArrayList<>();
		List<String> nicknames = request.nicknames();
		for (int i = 0; i < nicknames.size(); i++) {
			members.add(new RoomMember(room, nicknames.get(i), i));
		}
		roomMemberRepository.saveAll(members);

		return RoomResponse.of(room, members);
	}

	/**
	 * 공유 링크의 share_code로 방과 참여자 목록을 조회한다.
	 * 방이 없으면 404(ROOM_NOT_FOUND), 생성 후 7일이 지났으면 410(ROOM_EXPIRED)을 던진다.
	 */
	@Transactional(readOnly = true)
	public RoomResponse getRoomByShareCode(String shareCode) {
		SettlementRoom room =
				settlementRoomRepository
						.findByShareCode(shareCode)
						.orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
		RoomExpirationValidator.validateNotExpired(room.getCreatedAt());

		List<RoomMember> members = roomMemberRepository.findAllByRoomIdOrderByDisplayOrder(room.getId());
		return RoomResponse.of(room, members);
	}

	/** 방 이름이 비어있거나 공백뿐이거나 10자를 초과하면 예외를 던진다. */
	private void validateTitle(String title) {
		if (title == null || title.isBlank() || title.length() > MAX_TITLE_LENGTH) {
			throw new BusinessException(ErrorCode.INVALID_TITLE);
		}
	}

	/**
	 * 참여자 닉네임 목록을 검증한다.
	 * 최소 인원(2명) 미달, 개별 닉네임 형식 위반, 목록 내 중복(대소문자 무시)을 각각 확인한다.
	 */
	private void validateNicknames(List<String> nicknames) {
		if (nicknames == null || nicknames.size() < MIN_MEMBER_COUNT) {
			throw new BusinessException(ErrorCode.INVALID_MEMBER_COUNT);
		}

		Set<String> seenNicknames = new HashSet<>();
		for (String nickname : nicknames) {
			if (isInvalidNickname(nickname)) {
				throw new BusinessException(ErrorCode.INVALID_NICKNAME);
			}
			// 대소문자만 다른 닉네임도 같은 사람으로 간주해 중복 처리한다.
			if (!seenNicknames.add(nickname.toLowerCase())) {
				throw new BusinessException(ErrorCode.DUPLICATE_NICKNAME);
			}
		}
	}

	/** 닉네임이 1~10자 범위를 벗어나거나 공백 문자를 포함하면 true를 반환한다. */
	private boolean isInvalidNickname(String nickname) {
		if (nickname == null || nickname.isEmpty() || nickname.length() > MAX_NICKNAME_LENGTH) {
			return true;
		}
		return nickname.chars().anyMatch(Character::isWhitespace);
	}

	/**
	 * 충돌하지 않는 share_code를 발급한다.
	 * 무작위로 만든 뒤 DB에 이미 존재하는지 확인하고, 존재하면 재시도한다.
	 * 6자리 조합 공간이 넓어(36^6) 실무에서 상한(5회)까지 소진될 가능성은 매우 낮다.
	 */
	private String generateShareCode() {
		for (int attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt++) {
			String candidate = randomShareCode();
			if (!settlementRoomRepository.existsByShareCode(candidate)) {
				return candidate;
			}
		}
		throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
	}

	/** SecureRandom으로 소문자+숫자 6자리 문자열 하나를 생성한다. */
	private String randomShareCode() {
		StringBuilder shareCode = new StringBuilder(SHARE_CODE_LENGTH);
		for (int i = 0; i < SHARE_CODE_LENGTH; i++) {
			shareCode.append(SHARE_CODE_ALPHABET.charAt(secureRandom.nextInt(SHARE_CODE_ALPHABET.length())));
		}
		return shareCode.toString();
	}
}
