package com.example.oide.room.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.oide.room.domain.RoomMember;

/** RoomMember(정산방 참여자) 엔티티의 영속성 조회/저장을 담당한다. */
public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {

	/** 방 상세 조회 응답에 참여자를 등록 순서(displayOrder)대로 내려주기 위한 조회. */
	List<RoomMember> findByRoomIdOrderByDisplayOrderAsc(Long roomId);
}
