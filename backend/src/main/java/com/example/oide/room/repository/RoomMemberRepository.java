package com.example.oide.room.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.oide.room.domain.RoomMember;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {

	List<RoomMember> findAllByRoomIdOrderByDisplayOrder(Long roomId);

	List<RoomMember> findAllByIdInAndRoomId(List<Long> ids, Long roomId);
}
