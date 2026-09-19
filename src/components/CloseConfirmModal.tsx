/**
 * 关闭程序确认弹窗（V2.49.0）
 *
 * 背景：原先由主进程用 electron 的 dialog.showMessageBoxSync 弹出 Windows 原生对话框，
 * 样式与软件整体风格不符，且只有「最小化到托盘 / 退出软件」两个按钮，用户误点后无法反悔。
 * 现改为：主进程只负责「通知」（send 'ask-close-behavior'），弹窗由渲染进程用 antd Modal 呈现，
 * 风格与软件一致，并增加「取消」——取消后窗口保持打开。
 *
 * 关闭行为设置仍由主进程持有（exit / tray / ask）；本组件仅在 'ask' 模式下被唤起。
 */
import { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { Minimize2, Power, X } from 'lucide-react';
import { isElectron } from '../lib/env';
import { BRAND } from '../constants/theme';

type Choice = 'tray' | 'quit' | 'cancel';

export default function CloseConfirmModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isElectron()) return;
    const off = window.electronAPI?.onAskCloseBehavior?.(() => setOpen(true));
    return () => {
      try { off?.(); } catch { /* 忽略清理异常 */ }
    };
  }, []);

  const choose = (choice: Choice) => {
    setOpen(false);
    window.electronAPI?.closeBehaviorChoice?.(choice);
  };

  return (
    <Modal
      open={open}
      onCancel={() => choose('cancel')}
      footer={null}
      width={452}
      centered
      mask={{ closable: false }}
      keyboard={false}
      closeIcon={<X size={16} />}
      title={null}
    >
      <div style={{ padding: '4px 2px 0' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(37,99,235,.12)', color: BRAND.primaryDark,
            }}
          >
            <Power size={22} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
              关闭程序
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.75 }}>
              您希望如何关闭本程序？选择「最小化到托盘」可保留后台运行，双击托盘图标即可恢复。
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, flexWrap: 'wrap' }}>
          <button className="dash-action" onClick={() => choose('cancel')}>
            取消
          </button>
          <button className="dash-action" onClick={() => choose('tray')}>
            <Minimize2 size={15} /> 最小化到托盘
          </button>
          <button className="dash-action dash-action-primary" onClick={() => choose('quit')}>
            <Power size={15} /> 退出软件
          </button>
        </div>
      </div>
    </Modal>
  );
}
