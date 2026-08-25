package com.example.oide.splitgroup.domain;

import com.example.oide.room.domain.RoomMember;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
		name = "split_group_member",
		uniqueConstraints = @UniqueConstraint(columnNames = {"split_group_id", "member_id"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SplitGroupMember {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "split_group_id", nullable = false)
	private SplitGroup group;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "member_id", nullable = false)
	private RoomMember member;

	private int displayOrder;

	public SplitGroupMember(SplitGroup group, RoomMember member, int displayOrder) {
		// 그룹과 방 참여자를 연결하고 화면·분담 계산에 사용할 표시 순서를 보관한다.
		this.group = group;
		this.member = member;
		this.displayOrder = displayOrder;
	}
}
