/**
 * 그룹 이름 생성.
 *
 * 참여자 닉네임을 가운뎃점으로 나열한다. 인원이 많아 한 줄을 넘기면
 * `민서 외 4명` 으로 줄인다.
 */

import { GROUP_NAME_MAX_NICKNAMES } from '../constants/roomRules';
import type { RoomMember } from '../types/room';

export function buildGroupName(members: RoomMember[]): string {
  if (members.length === 0) return '';

  const nicknames = members.map((member) => member.nickname);
  if (nicknames.length <= GROUP_NAME_MAX_NICKNAMES) {
    return nicknames.join('·');
  }
  return `${nicknames[0]} 외 ${nicknames.length - 1}명`;
}
