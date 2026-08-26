interface SettlementClipboardTransfer {
  senderNickname: string;
  receiverNickname: string;
  amountKrw: string;
}

export function buildSettlementClipboardText(
  quotedAt: string | null,
  transfers: readonly SettlementClipboardTransfer[],
): string {
  const lines = ['🍞 엔빵 정산', ''];

  if (quotedAt) {
    lines.push('----------- 적용 환율 기준 -----------', quotedAt, '', '');
  }

  lines.push(
    '----------- 최종 정산 금액 -----------',
    ...transfers.map(
      (transfer) =>
        `🧾 ${transfer.senderNickname} → ${transfer.receiverNickname}: ${transfer.amountKrw}`,
    ),
  );

  return lines.join('\n');
}
