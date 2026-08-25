package com.example.oide.room.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.oide.room.domain.RoomMember;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {

	/** 방 상세 조회 응답에 참여자를 등록 순서대로 내려주기 위한 조회. */
	List<RoomMember> findAllByRoomIdOrderByDisplayOrder(Long roomId);

	/** 정산 그룹 등에서 요청된 멤버 id들이 실제로 해당 방에 속하는지 검증할 때 사용. */
	List<RoomMember> findAllByIdInAndRoomId(List<Long> ids, Long roomId);
}
