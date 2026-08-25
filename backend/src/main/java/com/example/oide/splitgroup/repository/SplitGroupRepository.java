package com.example.oide.splitgroup.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.oide.splitgroup.domain.SplitGroup;
import com.example.oide.splitgroup.domain.SplitGroupType;

public interface SplitGroupRepository extends JpaRepository<SplitGroup, Long> {

	Optional<SplitGroup> findByRoomIdAndType(Long roomId, SplitGroupType type);

	List<SplitGroup> findAllByRoomIdOrderByTypeAscIdAsc(Long roomId);
}
