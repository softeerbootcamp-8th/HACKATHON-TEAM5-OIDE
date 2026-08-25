import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import { TextField } from '../components/common/TextField';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import {
  DEFAULT_CURRENCY,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
} from '../constants/roomRules';
import { ROUTES, createDonePath } from '../constants/routes';
import { useCreateRoomDraft } from '../hooks/useCreateRoomDraft';
import { createRoom } from '../services/roomService';
import { isApiError } from '../types/api';
import { normalizeNickname } from '../utils/nicknameValidation';
import styles from './CreateRoomNamePage.module.css';

/**
 * 방 이름 입력. 위저드의 마지막 단계이자 실제로 방을 만드는 화면이다.
 *
 * 통화 선택 UI 가 아직 없어 defaultCurrency 는 상수를 보낸다.
 */
export function CreateRoomNamePage() {
  const navigate = useNavigate();
  const { draft, setTitle, clear } = useCreateRoomDraft();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trimmedTitle = draft.title.trim();
  const titleTooLong = trimmedTitle.length > NICKNAME_MAX_LENGTH;
  const canSubmit = trimmedTitle.length >= NICKNAME_MIN_LENGTH && !titleTooLong;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const room = await createRoom({
        title: trimmedTitle,
        defaultCurrency: DEFAULT_CURRENCY,
        members: draft.nicknames.map((nickname, index) => ({
          nickname: normalizeNickname(nickname),
          displayOrder: index,
        })),
      });

      clear();
      navigate(createDonePath(room.shareCode), { replace: true });
    } catch (error) {
      setSubmitError(
        isApiError(error)
          ? error.message
          : '정산방을 만들지 못했어요. 잠시 후 다시 시도해주세요.',
      );
      setSubmitting(false);
    }
  };

  return (
    <MobileFrame>
      <AppBar backTo={ROUTES.createNicknames} />
      <ScreenBody>
        <ScreenHeader
          title={'정산 방의 이름을\n입력해주세요'}
          description="모든 참여자에게 표시되는 이름이에요."
        />
        <div className={styles.content}>
          <TextField
            value={draft.title}
            placeholder="방 이름"
            autoComplete="off"
            aria-label="정산방 이름"
            maxLengthHint={NICKNAME_MAX_LENGTH}
            helperText={`${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자`}
            errorMessage={
              titleTooLong ? `${NICKNAME_MAX_LENGTH}자까지 쓸 수 있어요` : undefined
            }
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
      </ScreenBody>
      <BottomActionBar>
        {submitError && <Banner message={submitError} />}
        <Button
          disabled={!canSubmit}
          loading={submitting}
          loadingLabel="정산방을 만들고 있어요…"
          onClick={handleSubmit}
        >
          정산방 만들기
        </Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
