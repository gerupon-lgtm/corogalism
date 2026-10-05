/** 挑戦の終了前に確認。戻る操作を既定にし、背景のボタンへの誤操作を防ぐ。 */
export function createRunEndConfirm(root, onConfirm) {
  const dialog = root.querySelector('#run-end-confirm');
  let opener = null;
  root.querySelector('#btn-end-cancel').addEventListener('click', () => dialog.close());
  root.querySelector('#btn-end-confirm').addEventListener('click', () => {
    if (!dialog.open) return;
    dialog.close();
    onConfirm();
  });
  dialog.addEventListener('close', () => {
    root.body.classList.remove('end-confirm-open');
    if (opener?.getClientRects().length) opener.focus({ preventScroll: true });
    opener = null;
  });
  return {
    open(trigger) {
      if (dialog.open) return;
      opener = trigger;
      root.body.classList.add('end-confirm-open');
      dialog.showModal();
    },
    close() { if (dialog.open) dialog.close(); },
  };
}
