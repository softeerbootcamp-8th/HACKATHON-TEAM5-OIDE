package com.example.oide.splitgroup.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.oide.splitgroup.domain.SplitGroupMember;

public interface SplitGroupMemberRepository extends JpaRepository<SplitGroupMember, Long> {

	List<SplitGroupMember> findAllByGroupIdOrderByDisplayOrderAsc(Long groupId);

	void deleteAllByGroupId(Long groupId);
}
