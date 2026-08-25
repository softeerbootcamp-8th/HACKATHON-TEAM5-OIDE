package com.example.oide.splitgroup.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;
import com.example.oide.splitgroup.domain.SplitGroup;
import com.example.oide.splitgroup.domain.SplitGroupType;
import com.example.oide.splitgroup.dto.CreateSplitGroupRequest;
import com.example.oide.splitgroup.dto.SplitGroupResponse;
import com.example.oide.splitgroup.dto.UpdateSplitGroupRequest;
import com.example.oide.splitgroup.repository.SplitGroupRepository;

@SpringBootTest
@Transactional
class SplitGroupServiceTest {

	@Autowired
	private SplitGroupService splitGroupService;

	@Autowired
	private SettlementRoomRepository roomRepository;

	@Autowired
	private RoomMemberRepository roomMemberRepository;

	@Autowired
	private SplitGroupRepository groupRepository;

	private SettlementRoom room;
	private RoomMember firstMember;
	private RoomMember secondMember;
	private RoomMember thirdMember;

	@BeforeEach
	void setUp() {
		room = roomRepository.save(new SettlementRoom("test-code", "테스트 방", "KRW"));
		firstMember = roomMemberRepository.save(new RoomMember(room, "첫째", 1));
		secondMember = roomMemberRepository.save(new RoomMember(room, "둘째", 2));
		thirdMember = roomMemberRepository.save(new RoomMember(room, "셋째", 3));
	}

	@Test
	void createsCustomGroupWithMembersInDisplayOrder() {
		SplitGroupResponse response = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest("식사", List.of(thirdMember.getId(), firstMember.getId())));

		assertEquals("식사", response.name());
		assertEquals(SplitGroupType.CUSTOM, response.type());
		assertEquals(List.of(firstMember.getId(), thirdMember.getId()),
				response.members().stream().map(SplitGroupResponse.MemberResponse::id).toList());
	}

	@Test
	void initializesAllGroupOnlyOnce() {
		List<SplitGroupResponse> firstResponse = splitGroupService.findAll(room.getId());
		List<SplitGroupResponse> secondResponse = splitGroupService.findAll(room.getId());

		assertEquals(1, firstResponse.size());
		assertEquals(1, secondResponse.size());
		assertEquals(SplitGroupType.ALL, firstResponse.getFirst().type());
		assertEquals(3, firstResponse.getFirst().members().size());
		assertEquals(1, groupRepository.findAllByRoomIdOrderByTypeAscIdAsc(room.getId()).size());
	}

	@Test
	void updatesAndDeletesCustomGroup() {
		SplitGroupResponse created = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest("식사", List.of(firstMember.getId(), secondMember.getId())));

		SplitGroupResponse updated = splitGroupService.update(
				room.getId(),
				created.id(),
				new UpdateSplitGroupRequest("교통", List.of(secondMember.getId(), thirdMember.getId())));
		splitGroupService.delete(room.getId(), created.id());

		assertEquals("교통", updated.name());
		assertEquals(List.of(secondMember.getId(), thirdMember.getId()),
				updated.members().stream().map(SplitGroupResponse.MemberResponse::id).toList());
		assertTrue(groupRepository.findById(created.id()).isEmpty());
	}

	@Test
	void rejectsAllGroupUpdate() {
		SplitGroup allGroup = splitGroupService.initializeAllGroup(room.getId());

		BusinessException exception = assertThrows(BusinessException.class, () -> splitGroupService.update(
				room.getId(),
				allGroup.getId(),
				new UpdateSplitGroupRequest("변경", List.of(firstMember.getId(), secondMember.getId()))));

		assertEquals(ErrorCode.ALL_GROUP_IMMUTABLE, exception.getErrorCode());
	}
}
