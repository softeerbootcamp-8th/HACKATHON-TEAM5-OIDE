import { getRoom } from './generated/client';
import type { RoomResponse } from './generated/models';
import { callOrval } from './orvalResponse';
import { ApiError } from '../types/api';

const roomIdRequests = new Map<string, Promise<number>>();

async function fetchRoomId(shareCode: string): Promise<number> {
  const room = await callOrval<RoomResponse>(() => getRoom(shareCode));

  if (room.roomId === undefined) {
    throw new ApiError('UNKNOWN_ERROR', '정산방 응답에 roomId가 없어요.');
  }

  return room.roomId;
}

export function resolveRoomId(shareCode: string): Promise<number> {
  const cachedRequest = roomIdRequests.get(shareCode);
  if (cachedRequest) return cachedRequest;

  const request = fetchRoomId(shareCode).catch((error: unknown) => {
    roomIdRequests.delete(shareCode);
    throw error;
  });
  roomIdRequests.set(shareCode, request);
  return request;
}
