import { useCallback, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { SelectableMemberRow } from '../components/common/SelectableMemberRow';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { MIN_GROUP_MEMBER_COUNT } from '../constants/roomRules';
import { joinRoomPath, splitGroupItemsPath, splitGroupsPath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getRoomByShareCode } from '../services/roomService';
import { createSplitGroup, getSplitGroups, updateSplitGroup } from '../services/splitGroupService';
import { isApiError } from '../types/api';
import type { SplitGroup } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import { buildGroupName } from '../utils/groupName';
import styles from './SplitGroupMembersPage.module.css';

interface MembersData {
  room: SettlementRoom;
  groups: SplitGroup[];
  group: SplitGroup | null;
}

function hasSameMemberIds(first: string[], second: string[]): boolean {
  if (first.length !== second.length) return false;

  const firstIds = new Set(first);
  return second.every((memberId) => firstIds.has(memberId));
}

/**
 * D-02 그룹 인원 선택. 새로 만들 때와 인원을 고칠 때 같은 화면을 쓴다.
 *
 * 그룹 이름은 고른 닉네임을 나열해 자동으로 만들어진다.
 * 1명짜리 그룹은 만들 수 없다. 혼자 부담할 항목은 정산 대상에서 빼면 된다.
 */
export function SplitGroupMembersPage() {
  const { shareCode = '', groupId } = useParams<{ shareCode: string; groupId?: string }>();
  const { identity } = useLocalIdentity(shareCode);

  const load = useCallback(async (): Promise<MembersData> => {
    const [room, groups] = await Promise.all([
      getRoomByShareCode(shareCode),
      getSplitGroups(shareCode),
    ]);
    return {
      room,
      groups,
      group: groups.find((group) => group.id === groupId) ?? null,
    };
  }, [shareCode, groupId]);

  const { status, data, error, retry } = useAsync(load, [shareCode, groupId]);

  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }
  if (
    status === 'success' &&
    groupId &&
    (!data?.group || data.group.creatorMemberId !== identity.memberId)
  ) {
    return <Navigate to={splitGroupsPath(shareCode)} replace />;
  }

  // 수정 화면은 기존 인원을 미리 골라둔 상태로 연다.
  const effectiveIds = selectedIds ?? data?.group?.memberIds ?? [];
  const selectedMembers =
    data?.room.members.filter((member) => effectiveIds.includes(member.id)) ?? [];
  const selectedMemberIds = selectedMembers.map((member) => member.id);
  const isDuplicateGroup =
    selectedMembers.length >= MIN_GROUP_MEMBER_COUNT &&
    (data?.groups.some(
      (group) =>
        group.id !== groupId &&
        (group.type === 'ALL' || group.creatorMemberId === identity.memberId) &&
        hasSameMemberIds(group.memberIds, selectedMemberIds),
    ) ?? false);
  const canSubmit =
    selectedMembers.length >= MIN_GROUP_MEMBER_COUNT && !isDuplicateGroup;
  const submitLabel = isDuplicateGroup
    ? '존재하는 그룹이에요'
    : groupId
      ? '그룹 수정'
      : '그룹 만들기';
  const returnPath = groupId
    ? splitGroupItemsPath(shareCode, groupId)
    : splitGroupsPath(shareCode);
  const { goBack } = useBackNavigation(returnPath);

  // 연속으로 눌러도 앞선 선택이 사라지지 않도록 함수형으로 갱신한다.
  const toggle = (memberId: string) => {
    setSelectedIds((current) => {
      const base = current ?? data?.group?.memberIds ?? [];
      return base.includes(memberId)
        ? base.filter((id) => id !== memberId)
        : [...base, memberId];
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const groupName = buildGroupName(selectedMembers);
      if (groupId) {
        await updateSplitGroup(
          shareCode,
          groupId,
          identity.memberId,
          groupName,
          selectedMemberIds,
        );
      } else {
        await createSplitGroup(shareCode, groupName, selectedMemberIds, identity.memberId);
      }
      goBack();
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '그룹을 저장하지 못했어요.');
      setSubmitting(false);
    }
  };

  return (
    <MobileFrame tone="white">
      <AppBar backTo={returnPath} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && (
        <>
          <ScreenBody>
            <ScreenHeader
              title={groupId ? '그룹 인원을\n선택해주세요' : '새로운 그룹 인원을\n선택해주세요'}
              description={`그룹은 ${MIN_GROUP_MEMBER_COUNT}명 이상 배정되어야 해요.`}
            />
            <div className={styles.content}>
              <div className={styles.nameBox}>
                <span className={styles.nameLabel}>그룹 이름</span>
                <span className={styles.nameValue}>
                  {selectedMembers.length > 0 ? buildGroupName(selectedMembers) : '인원을 골라주세요'}
                </span>
              </div>

              <ul className={styles.members}>
                {data.room.members.map((member) => (
                  <li key={member.id}>
                    <SelectableMemberRow
                      nickname={member.nickname}
                      selected={effectiveIds.includes(member.id)}
                      onSelect={() => toggle(member.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </ScreenBody>

          <BottomActionBar>
            {submitError && <Banner message={submitError} />}
            <Button
              disabled={!canSubmit}
              loading={submitting}
              loadingLabel="저장하고 있어요…"
              onClick={handleSubmit}
            >
              {submitLabel}
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
