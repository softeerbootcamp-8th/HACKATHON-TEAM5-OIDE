package com.example.oide.splitgroup.service;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;
import com.example.oide.splitgroup.domain.SplitGroup;
import com.example.oide.splitgroup.domain.SplitGroupMember;
import com.example.oide.splitgroup.domain.SplitGroupType;
import com.example.oide.splitgroup.dto.CreateSplitGroupRequest;
import com.example.oide.splitgroup.dto.SplitGroupResponse;
import com.example.oide.splitgroup.dto.UpdateSplitGroupRequest;
import com.example.oide.splitgroup.repository.SplitGroupMemberRepository;
import com.example.oide.splitgroup.repository.SplitGroupRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
// 정산 그룹의 생성·조회·수정·삭제와 구성원 관리를 담당한다.
public class SplitGroupService {

	private static final String ALL_GROUP_NAME = "전체";

	private final SettlementRoomRepository roomRepository;
	private final RoomMemberRepository roomMemberRepository;
	private final SplitGroupRepository groupRepository;
	private final SplitGroupMemberRepository groupMemberRepository;

	// 정산방에 전체 그룹이 없으면 생성한다.
	@Transactional
	public SplitGroup initializeAllGroup(Long roomId) {
		// 정산방마다 전체 그룹은 하나만 존재하므로 먼저 기존 데이터를 조회한다.
		return groupRepository.findByRoomIdAndType(roomId, SplitGroupType.ALL)
				// 처음 그룹 목록을 조회하는 방이라면 전체 그룹을 기본값으로 생성한다.
				.orElseGet(() -> groupRepository.save(
						new SplitGroup(findRoom(roomId), ALL_GROUP_NAME, SplitGroupType.ALL)));
	}

	// 사용자 지정 그룹과 구성원을 생성한다.
	@Transactional
	public SplitGroupResponse create(Long roomId, CreateSplitGroupRequest request) {
		// 그룹이 생성될 정산방이 실제로 존재하는지 먼저 확인한다.
		SettlementRoom room = findRoom(roomId);
		// 요청한 참여자가 모두 이 정산방에 속하는지 확인하고 표시 순서로 정렬한다.
		List<RoomMember> members = findMembers(roomId, request.memberIds());
		// 사용자 지정 그룹은 최소 두 명이 있어야 분담 대상이 된다.
		validateMemberCount(members);
		// 그룹 자체를 저장한 뒤 생성된 그룹 ID를 구성원 연결 데이터에서 사용한다.
		SplitGroup group = groupRepository.save(new SplitGroup(room, request.name().trim(), SplitGroupType.CUSTOM));
		// 그룹과 참여자의 다대다 관계를 SplitGroupMember로 저장한다.
		groupMemberRepository.saveAll(createGroupMembers(group, members));
		// 저장된 그룹과 구성원을 화면에 필요한 형태로 반환한다.
		return toResponse(group, members);
	}

	// 전체 그룹과 사용자 지정 그룹 목록을 조회한다.
	@Transactional
	public List<SplitGroupResponse> findAll(Long roomId) {
		// 전체 그룹이 없는 기존 정산방도 목록을 열면 기본 그룹을 갖도록 보장한다.
		initializeAllGroup(roomId);
		// 전체 그룹과 사용자 지정 그룹을 조회하고 각 그룹의 현재 구성원을 함께 응답으로 만든다.
		return groupRepository.findAllByRoomIdOrderByTypeAscIdAsc(roomId).stream()
				.map(group -> toResponse(group, findGroupMembers(group, roomId)))
				.toList();
	}

	// 사용자 지정 그룹명과 구성원을 수정한다.
	@Transactional
	public SplitGroupResponse update(Long roomId, Long groupId, UpdateSplitGroupRequest request) {
		// 전체 그룹은 고정이므로 사용자 지정 그룹인지와 방 소속을 함께 확인한다.
		SplitGroup group = findCustomGroup(roomId, groupId);
		// 변경하려는 구성원도 현재 정산방의 참여자인지 확인한다.
		List<RoomMember> members = findMembers(roomId, request.memberIds());
		// 구성원 교체 후에도 최소 인원 수 조건을 만족해야 한다.
		validateMemberCount(members);
		// 그룹명은 공백을 제거한 값으로 변경한다.
		group.updateName(request.name().trim());
		// 기존 구성원 연결을 모두 제거한 뒤 요청한 구성원으로 다시 저장한다.
		groupMemberRepository.deleteAllByGroupId(groupId);
		// 기존 연결 삭제를 먼저 반영해 같은 참여자를 새 구성원으로 다시 저장할 수 있게 한다.
		groupMemberRepository.flush();
		groupMemberRepository.saveAll(createGroupMembers(group, members));
		// 변경된 그룹 정보와 구성원을 응답으로 반환한다.
		return toResponse(group, members);
	}

	// 사용자 지정 그룹을 삭제한다.
	@Transactional
	public void delete(Long roomId, Long groupId) {
		// 전체 그룹 삭제나 다른 정산방의 그룹 삭제를 막는다.
		SplitGroup group = findCustomGroup(roomId, groupId);
		// 외래 키 참조를 먼저 제거한 뒤 그룹을 삭제한다.
		groupMemberRepository.deleteAllByGroupId(groupId);
		// 구성원 연결 삭제를 먼저 반영해 그룹 삭제 시 외래 키 제약 위반을 막는다.
		groupMemberRepository.flush();
		groupRepository.delete(group);
	}

	// 그룹 유형에 맞는 구성원 목록을 조회한다.
	private List<RoomMember> findGroupMembers(SplitGroup group, Long roomId) {
		if (group.isAll()) {
			// 전체 그룹은 별도 구성원 데이터를 만들지 않고 정산방 참여자 전체를 사용한다.
			return roomMemberRepository.findAllByRoomIdOrderByDisplayOrder(roomId);
		}
		// 사용자 지정 그룹은 연결 테이블에 저장된 구성원을 표시 순서대로 조회한다.
		return groupMemberRepository.findAllByGroupIdOrderByDisplayOrderAsc(group.getId()).stream()
				.map(SplitGroupMember::getMember)
				.toList();
	}

	// 요청 참여자가 정산방에 속하는지 확인하고 표시 순서로 정렬한다.
	private List<RoomMember> findMembers(Long roomId, List<Long> memberIds) {
		// 같은 참여자를 두 번 선택한 요청은 그룹 구성으로 허용하지 않는다.
		Set<Long> uniqueIds = new HashSet<>(memberIds);
		if (uniqueIds.size() != memberIds.size()) {
			throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
		}
		// ID 목록과 정산방 ID를 함께 조건으로 사용해 다른 방 참여자 선택을 막는다.
		List<RoomMember> members = roomMemberRepository.findAllByIdInAndRoomId(memberIds, roomId);
		if (members.size() != uniqueIds.size()) {
			throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
		}
		// 이후 N빵의 기본 순서로도 사용할 수 있도록 방의 표시 순서로 정렬한다.
		return members.stream().sorted(Comparator.comparingInt(RoomMember::getDisplayOrder)).toList();
	}

	// 그룹과 구성원을 연결하는 데이터를 생성한다.
	private List<SplitGroupMember> createGroupMembers(SplitGroup group, List<RoomMember> members) {
		// 각 참여자의 방 내 표시 순서를 그룹 구성원 데이터에도 함께 저장한다.
		return members.stream()
				.map(member -> new SplitGroupMember(group, member, member.getDisplayOrder()))
				.toList();
	}

	// 정산방을 조회한다.
	private SettlementRoom findRoom(Long roomId) {
		// 그룹 작업은 반드시 존재하는 정산방 안에서만 수행한다.
		return roomRepository.findById(roomId)
				.orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
	}

	// 정산방 소속 사용자 지정 그룹을 조회한다.
	private SplitGroup findCustomGroup(Long roomId, Long groupId) {
		// 요청한 그룹이 존재하는지 확인한다.
		SplitGroup group = groupRepository.findById(groupId)
				.orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));
		// URL의 정산방과 그룹이 속한 정산방이 다르면 해당 그룹을 찾을 수 없는 것으로 처리한다.
		if (!group.getRoom().getId().equals(roomId)) {
			throw new BusinessException(ErrorCode.GROUP_NOT_FOUND);
		}
		// 전체 그룹은 정산방 참여자 전체를 의미하므로 사용자가 수정하거나 삭제할 수 없다.
		if (group.isAll()) {
			throw new BusinessException(ErrorCode.ALL_GROUP_IMMUTABLE);
		}
		return group;
	}

	// 사용자 지정 그룹의 최소 인원 수를 검증한다.
	private void validateMemberCount(List<RoomMember> members) {
		// 한 명만 포함된 그룹은 공동 분담 그룹으로 사용하지 않는다.
		if (members.size() < 2) {
			throw new BusinessException(ErrorCode.INVALID_GROUP_MEMBER_COUNT);
		}
	}

	// 그룹 엔티티를 API 응답으로 변환한다.
	private SplitGroupResponse toResponse(SplitGroup group, List<RoomMember> members) {
		// 엔티티를 외부에 노출하지 않고 화면에 필요한 기본 정보만 응답 DTO로 변환한다.
		return new SplitGroupResponse(
				group.getId(),
				group.getName(),
				group.getType(),
				members.stream()
						.map(member -> new SplitGroupResponse.MemberResponse(
								member.getId(), member.getNickname(), member.getDisplayOrder()))
						.toList());
	}
}
