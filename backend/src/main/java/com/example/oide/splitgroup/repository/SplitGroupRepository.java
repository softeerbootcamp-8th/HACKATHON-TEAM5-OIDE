package com.example.oide.splitgroup.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.oide.splitgroup.domain.SplitGroup;

public interface SplitGroupRepository extends JpaRepository<SplitGroup, Long> {

	List<SplitGroup> findAllByRoomIdOrderByTypeAscIdAsc(Long roomId);
}
