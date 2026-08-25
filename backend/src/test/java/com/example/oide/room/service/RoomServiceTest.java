package com.example.oide.room.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.dto.RoomCreateRequest;
import com.example.oide.room.dto.RoomResponse;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoomService 단위 테스트")
class RoomServiceTest {

	@Mock private SettlementRoomRepository settlementRoomRepository;

	@Mock private RoomMemberRepository roomMemberRepository;

	private RoomService roomService;

	private RoomService createRoomService() {
		return new RoomService(settlementRoomRepository, roomMemberRepository);
	}

	@Test
	@DisplayName("정상 입력으로 방을 생성하면 shareCode와 멤버 목록을 포함한 응답을 반환한다")
	void createsRoomWithGeneratedShareCode() {
		roomService = createRoomService();
		given(settlementRoomRepository.existsByShareCode(anyString())).willReturn(false);
		given(settlementRoomRepository.save(any(SettlementRoom.class)))
				.willAnswer(invocation -> invocation.getArgument(0));
		given(roomMemberRepository.saveAll(any())).willAnswer(invocation -> invocation.getArgument(0));

		RoomResponse response =
				roomService.createRoom(new RoomCreateRequest("여행 정산", List.of("민수", "영희")));

		assertThat(response.title()).isEqualTo("여행 정산");
		assertThat(response.defaultCurrency()).isEqualTo("KRW");
		assertThat(response.shareCode()).hasSize(6);
		assertThat(response.members()).hasSize(2);
		assertThat(response.members().get(0).nickname()).isEqualTo("민수");
		assertThat(response.members().get(0).displayOrder()).isEqualTo(0);
		assertThat(response.members().get(1).displayOrder()).isEqualTo(1);
	}

	@Test
	@DisplayName("방 이름이 빈 값/공백이면 INVALID_TITLE 예외를 던지고 저장하지 않는다")
	void rejectsBlankTitle() {
		roomService = createRoomService();

		assertThatThrownBy(() -> roomService.createRoom(new RoomCreateRequest("  ", List.of("민수", "영희"))))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_TITLE);
		verify(settlementRoomRepository, never()).save(any());
	}

	@Test
	@DisplayName("방 이름이 10자를 초과하면 INVALID_TITLE 예외를 던진다")
	void rejectsTitleLongerThanTenCharacters() {
		roomService = createRoomService();

		assertThatThrownBy(
						() ->
								roomService.createRoom(
										new RoomCreateRequest("12345678901", List.of("민수", "영희"))))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_TITLE);
	}

	@Test
	@DisplayName("참여자가 2명 미만이면 INVALID_MEMBER_COUNT 예외를 던진다")
	void rejectsFewerThanTwoMembers() {
		roomService = createRoomService();

		assertThatThrownBy(() -> roomService.createRoom(new RoomCreateRequest("여행 정산", List.of("민수"))))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_MEMBER_COUNT);
	}

	@Test
	@DisplayName("닉네임에 공백이 포함되면 INVALID_NICKNAME 예외를 던진다")
	void rejectsNicknameContainingWhitespace() {
		roomService = createRoomService();

		assertThatThrownBy(
						() ->
								roomService.createRoom(
										new RoomCreateRequest("여행 정산", List.of("민 수", "영희"))))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_NICKNAME);
	}

	@Test
	@DisplayName("대소문자만 다른 닉네임도 중복으로 보고 DUPLICATE_NICKNAME 예외를 던진다")
	void rejectsDuplicateNicknamesCaseInsensitively() {
		roomService = createRoomService();

		assertThatThrownBy(
						() ->
								roomService.createRoom(
										new RoomCreateRequest("여행 정산", List.of("minsu", "MinSu"))))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.DUPLICATE_NICKNAME);
	}

	@Test
	@DisplayName("share_code가 이미 존재하면 재시도해서 충돌하지 않는 새 코드를 발급한다")
	void retriesShareCodeGenerationOnCollision() {
		roomService = createRoomService();
		given(settlementRoomRepository.existsByShareCode(anyString())).willReturn(true, false);
		given(settlementRoomRepository.save(any(SettlementRoom.class)))
				.willAnswer(invocation -> invocation.getArgument(0));
		given(roomMemberRepository.saveAll(any())).willAnswer(invocation -> invocation.getArgument(0));

		roomService.createRoom(new RoomCreateRequest("여행 정산", List.of("민수", "영희")));

		verify(settlementRoomRepository, times(2)).existsByShareCode(anyString());
	}

	@Test
	@DisplayName("shareCode에 해당하는 방이 있고 만료되지 않았으면 방 정보를 반환한다")
	void returnsRoomWhenShareCodeExistsAndNotExpired() {
		roomService = createRoomService();
		SettlementRoom room = new SettlementRoom("abc123", "여행 정산", "KRW");
		ReflectionTestUtils.setField(room, "id", 1L);
		ReflectionTestUtils.setField(room, "createdAt", LocalDateTime.now().minusDays(1));
		given(settlementRoomRepository.findByShareCode("abc123")).willReturn(Optional.of(room));
		given(roomMemberRepository.findByRoomIdOrderByDisplayOrderAsc(1L))
				.willReturn(List.of(new RoomMember(room, "민수", 0)));

		RoomResponse response = roomService.getRoomByShareCode("abc123");

		assertThat(response.shareCode()).isEqualTo("abc123");
		assertThat(response.members()).hasSize(1);
	}

	@Test
	@DisplayName("shareCode에 해당하는 방이 없으면 ROOM_NOT_FOUND 예외를 던진다")
	void throwsRoomNotFoundWhenShareCodeMissing() {
		roomService = createRoomService();
		given(settlementRoomRepository.findByShareCode("missing")).willReturn(Optional.empty());

		assertThatThrownBy(() -> roomService.getRoomByShareCode("missing"))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.ROOM_NOT_FOUND);
	}

	@Test
	@DisplayName("생성된 지 7일이 지난 방을 조회하면 ROOM_EXPIRED 예외를 던진다")
	void throwsRoomExpiredWhenOlderThanSevenDays() {
		roomService = createRoomService();
		SettlementRoom room = new SettlementRoom("abc123", "여행 정산", "KRW");
		ReflectionTestUtils.setField(room, "id", 1L);
		ReflectionTestUtils.setField(room, "createdAt", LocalDateTime.now().minusDays(8));
		given(settlementRoomRepository.findByShareCode("abc123")).willReturn(Optional.of(room));

		assertThatThrownBy(() -> roomService.getRoomByShareCode("abc123"))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.ROOM_EXPIRED);
	}
}
