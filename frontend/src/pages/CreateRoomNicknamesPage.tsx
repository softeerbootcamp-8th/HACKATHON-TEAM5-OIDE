import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { TextField } from '../components/common/TextField';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
} from '../constants/roomRules';
import { ROUTES } from '../constants/routes';
import { useCreateRoomDraft } from '../hooks/useCreateRoomDraft';
import { normalizeNickname, validateNicknameList } from '../utils/nicknameValidation';
import styles from './CreateRoomNicknamesPage.module.css';

/**
 * A-03 닉네임 입력 / A-04 검증 에러.
 *
 * 에러는 원인별로 다른 문구를 쓴다. 아직 건드리지 않은 칸에는 에러를 띄우지 않는다.
 */
export function CreateRoomNicknamesPage() {
  const navigate = useNavigate();
  const { draft, setNickname } = useCreateRoomDraft();
  const [touched, setTouched] = useState<boolean[]>(() =>
    draft.nicknames.map(() => false),
  );

  const results = validateNicknameList(draft.nicknames);
  const allFilled = draft.nicknames.every(
    (nickname) => normalizeNickname(nickname).length >= NICKNAME_MIN_LENGTH,
  );
  const canProceed = allFilled && results.every((result) => result.valid);

  const markTouched = (index: number) => {
    setTouched((current) => {
      if (current[index]) return current;
      const next = [...current];
      next[index] = true;
      return next;
    });
  };

  return (
    <MobileFrame>
      <AppBar backTo={ROUTES.createMembers} />
      <ScreenBody>
        <ScreenHeader
          title={'함께 정산할 사람의\n닉네임을 적어주세요'}
          description="나중에 각자 링크로 들어와 자기 닉네임을 고릅니다."
        />
        <div className={styles.fields}>
          {draft.nicknames.map((nickname, index) => {
            const result = results[index];
            const showError = touched[index] && Boolean(result?.message);
            // 카운터는 길이가 근거일 때만 보여준다. 중복·공백 에러에는 붙이지 않는다.
            const showCounter = !showError || result?.reason === 'TOO_LONG';

            return (
              <TextField
                key={index}
                value={nickname}
                placeholder="닉네임"
                autoComplete="off"
                aria-label={`참여자 ${index + 1} 닉네임`}
                maxLengthHint={showCounter ? NICKNAME_MAX_LENGTH : undefined}
                helperText={`${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자`}
                errorMessage={showError ? result?.message : undefined}
                onChange={(event) => {
                  setNickname(index, event.target.value);
                  markTouched(index);
                }}
                onBlur={() => markTouched(index)}
              />
            );
          })}
        </div>
      </ScreenBody>
      <BottomActionBar>
        <Button
          disabled={!canProceed}
          onClick={() => navigate(ROUTES.createName)}
        >
          다음
        </Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
