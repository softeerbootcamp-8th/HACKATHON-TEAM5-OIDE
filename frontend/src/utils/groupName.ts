/**
 * 그룹 이름 생성.
 *
 * 참여자 닉네임을 가운뎃점으로 나열한다.
 */

import type { RoomMember } from '../types/room';

export function buildGroupName(members: RoomMember[]): string {
  return members.map((member) => member.nickname).join('·');
}
