/**
 * 목 모드에서 정산방을 보관하는 인메모리 + sessionStorage 저장소.
 *
 * 백엔드가 붙으면 통째로 쓰이지 않는다. 서비스 계층 뒤에 숨어 있으므로
 * 화면 코드는 이 파일의 존재를 모른다.
 */

import { ROOM_TTL_DAYS } from '../constants/roomRules';
import type { MemberPaymentSummary } from '../types/payment';
import type { CreateRoomRequest, RoomMember, SettlementRoom } from '../types/room';
import { SEED_PAYMENT_SUMMARIES, SEED_ROOMS } from './mockRooms';

const STORAGE_KEY = 'oide:mock:rooms';

function readStorage(): SettlementRoom[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SettlementRoom[];
  } catch {
    // 프라이빗 모드 등에서 접근이 막힐 수 있다. 시드만으로 동작한다.
    return [];
  }
}

function writeStorage(rooms: SettlementRoom[]): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    // 저장에 실패해도 이번 세션 동작에는 영향이 없다.
  }
}

/** 충돌 가능성이 낮은 짧은 공유 코드를 만든다. */
function generateShareCode(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function buildMembers(
  roomId: string,
  input: CreateRoomRequest['members'],
  createdAt: string,
): RoomMember[] {
  return [...input]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((member, index) => ({
      id: `${roomId}-m${index + 1}`,
      roomId,
      nickname: member.nickname,
      displayOrder: index,
      createdAt,
    }));
}

export const mockRoomStore = {
  findByShareCode(shareCode: string): SettlementRoom | undefined {
    const created = readStorage();
    return (
      created.find((room) => room.shareCode === shareCode) ??
      SEED_ROOMS.find((room) => room.shareCode === shareCode)
    );
  },

  create(request: CreateRoomRequest): SettlementRoom {
    const createdDate = new Date();
    const createdAt = createdDate.toISOString();
    const expiresDate = new Date(createdDate);
    expiresDate.setDate(expiresDate.getDate() + ROOM_TTL_DAYS);

    const id = `room-${createdDate.getTime()}`;
    const room: SettlementRoom = {
      id,
      shareCode: generateShareCode(),
      title: request.title,
      defaultCurrency: request.defaultCurrency,
      createdAt,
      expiresAt: expiresDate.toISOString(),
      members: buildMembers(id, request.members, createdAt),
    };

    writeStorage([...readStorage(), room]);
    return room;
  },

  /**
   * 참여자별 결제 내역 등록 요약.
   * 새로 만든 방은 비어 있고, 시드 방(오사카 여행)에는 준영의 내역이 있다.
   */
  findPaymentSummaries(roomId: string): MemberPaymentSummary[] {
    return SEED_PAYMENT_SUMMARIES[roomId] ?? [];
  },
};
