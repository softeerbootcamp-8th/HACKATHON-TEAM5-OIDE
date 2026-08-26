/**
 * 목 모드의 분담 그룹 저장소.
 *
 * `전체` 그룹은 사용자가 만들지 않는다. 방을 처음 열 때 없으면 여기서 만들어 둔다.
 */

import { ALL_GROUP_NAME } from '../constants/roomRules';
import type { SplitGroup } from '../types/payment';
import type { RoomMember } from '../types/room';
import { buildGroupName } from '../utils/groupName';

const STORAGE_KEY = 'oide:mock:splitGroups';

function read(): SplitGroup[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SplitGroup[]) : [];
  } catch {
    return [];
  }
}

function write(groups: SplitGroup[]): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // 저장 실패는 이번 세션 동작에 영향이 없다.
  }
}

export const mockSplitGroupStore = {
  /** 방의 그룹 목록. `전체` 가 항상 첫 번째다. */
  findByRoom(roomId: string, members: RoomMember[]): SplitGroup[] {
    const groups = read().filter((group) => group.roomId === roomId);

    if (!groups.some((group) => group.type === 'ALL')) {
      const now = new Date().toISOString();
      const allGroup: SplitGroup = {
        id: `${roomId}-all`,
        roomId,
        name: ALL_GROUP_NAME,
        type: 'ALL',
        creatorMemberId: null,
        memberIds: members.map((member) => member.id),
        createdAt: now,
        updatedAt: now,
      };
      write([...read(), allGroup]);
      groups.unshift(allGroup);
    }

    return [...groups].sort((a, b) => (a.type === 'ALL' ? -1 : b.type === 'ALL' ? 1 : 0));
  },

  create(roomId: string, members: RoomMember[], creatorMemberId: string): SplitGroup {
    const now = new Date().toISOString();
    const group: SplitGroup = {
      id: `grp-${Date.now()}`,
      roomId,
      name: buildGroupName(members),
      type: 'CUSTOM',
      creatorMemberId,
      memberIds: members.map((member) => member.id),
      createdAt: now,
      updatedAt: now,
    };
    write([...read(), group]);
    return group;
  },

  update(groupId: string, members: RoomMember[]): SplitGroup {
    const groups = read();
    const target = groups.find((group) => group.id === groupId);
    if (!target) {
      throw new Error(`그룹을 찾을 수 없습니다: ${groupId}`);
    }
    target.memberIds = members.map((member) => member.id);
    target.name = buildGroupName(members);
    target.updatedAt = new Date().toISOString();
    write(groups);
    return target;
  },

  remove(groupId: string): void {
    write(read().filter((group) => group.id !== groupId));
  },
};
