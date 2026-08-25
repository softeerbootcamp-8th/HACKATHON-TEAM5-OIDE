/**
 * 공유 링크 문자열 구성.
 */

import { SHARE_LINK_ORIGIN } from '../api/apiConfig';
import { joinRoomPath } from '../constants/routes';

/** 복사·전달에 쓰는 전체 URL. */
export function buildShareUrl(shareCode: string): string {
  return `${SHARE_LINK_ORIGIN}${joinRoomPath(shareCode)}`;
}

/** 화면에 보여줄 축약 표기. 스킴을 떼어 가로 폭을 아낀다. */
export function formatShareUrlForDisplay(shareCode: string): string {
  return buildShareUrl(shareCode).replace(/^https?:\/\//, '');
}
