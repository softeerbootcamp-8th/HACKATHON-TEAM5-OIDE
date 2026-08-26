package com.example.oide.splitgroup.domain;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "split_group")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SplitGroup {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "room_id", nullable = false)
	private SettlementRoom room;

	@Column(nullable = false)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private SplitGroupType type;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "creator_member_id")
	private RoomMember creator;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	public SplitGroup(SettlementRoom room, String name, SplitGroupType type) {
		this(room, name, type, null);
	}

	public SplitGroup(SettlementRoom room, String name, SplitGroupType type, RoomMember creator) {
		// 생성 시점에 그룹이 속한 정산방, 화면 표시명, 그룹 유형을 함께 고정한다.
		this.room = room;
		this.name = name;
		this.type = type;
		this.creator = creator;
	}

	public boolean isAll() {
		// 전체 그룹 여부는 문자열 비교 대신 enum 값으로 판별한다.
		return type == SplitGroupType.ALL;
	}

	public void updateName(String name) {
		// 전체 그룹 여부 검증은 서비스에서 끝낸 뒤 사용자 지정 그룹의 이름만 변경한다.
		this.name = name;
	}
}
