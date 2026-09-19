import { useMemo, useState } from 'react';
import { Modal, Input, Table, Checkbox, Select, Button, Tag, Space, Empty, Alert, App } from 'antd';
import { parsePlatformPaste, type ParsedPlatformRow } from '../utils/platformPasteParser';
import { pickRequestValue, statusFromPlatform, REQUEST_STATUS_FIELD } from '../utils/requestLedger';
import { toDateStr } from '../utils/format';
import { saveMassRecord, updateMassRecord, getMassRecords, getMassRecordById, rebuildGlobalIndexes } from '../store/massStore';
import type { MassRecord } from '../store/massStore';
import { recordFieldValues } from '../store/inputHistoryStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

const COOPERATE_UNITS = [
  '一中队', '二中队', '三中队', '涉众办', '法制室', '大队领导', '刑警大队',
  '治安大队', '直属大队', '政保大队', '城区派出所', '南麻派出所', '东里派出所',
  '悦庄派出所', '西里派出所', '大张庄派出所', '中庄派出所', '张家坡派出所',
  '鲁村派出所', '南鲁山派出所', '燕崖派出所', '石桥派出所', '开发区派出所',
];
const PLATFORMS = ['经侦云', '警综平台', '微信', '支付宝', '第三方支付平台'];

/** evidence-request 为 singleModule，真实 tabId 由 `${moduleId}-1` 生成 */
const REQUEST_TAB_ID = 'evidence-request-1';

/**
 * 导入时一并写入「全局历史池」的字段：
 * 这些值一旦导进来，就要和手工录入的数据一样，在其它模块的联想框里出现
 * （全局案件名称/编号另有 rebuildCaseIndex 索引兜底，这里的写入主要服务于
 *  「输入历史」型字段，如申请单号、查控类型、申请时间）。
 */
const HISTORY_FIELD_IDS = ['caseName', 'caseNo', 'requestNo', 'controlType', 'requestDate'] as const;

interface RowWithKey extends ParsedPlatformRow {
  key: string;
  /**
   * 导入动作：
   *  - `new`    申请单号在库里没有 → **追加**一条新记录
   *  - `update` 申请单号已存在 → **只更新**「调证状态 / 反馈时间 / 查控结果」三项，其余字段保持不动
   * 不同申请单号一律视为不同调证：即使案件名称、编号相同也不合并。
   */
  action: 'new' | 'update';
  /** action='update' 时命中已有记录的 id */
  existingId?: string;
}

export default function PlatformImportModal({ open, onClose, onImported }: Props) {
  const { message } = App.useApp();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<RowWithKey[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [cooperateUnit, setCooperateUnit] = useState<string | undefined>();
  const [platform, setPlatform] = useState<string | undefined>();
  const [importing, setImporting] = useState(false);

  /** 申请单号 → 已有记录（用于判断「追加」还是「更新」） */
  const existingByNo = useMemo(() => {
    const map = new Map<string, MassRecord>();
    for (const r of getMassRecords('evidence-request')) {
      // 兼容旧版 requestItems 数据：统一走 requestLedger 的取值规则
      const no = pickRequestValue(r.data as Record<string, unknown>, 'requestNo');
      if (no) map.set(String(no), r);
    }
    return map;
  }, [open]);

  const doParse = () => {
    const parsed = parsePlatformPaste(text);
    if (parsed.length === 0) {
      message.warning('没有解析出任何调证记录，请确认粘贴的是平台表格内容');
      return;
    }
    const withKeys: RowWithKey[] = parsed.map((r, i) => {
      const hit = r.requestNo ? existingByNo.get(String(r.requestNo)) : undefined;
      return {
        ...r,
        key: `${r.requestNo || i}-${i}`,
        action: hit ? 'update' : 'new',
        existingId: hit?.id,
      };
    });
    setRows(withKeys);
    // 默认全选：新号追加、同号刷新状态，一次粘贴即可把台账对齐到平台最新状态
    setSelectedKeys(withKeys.map((r) => r.key));
  };

  const clearAll = () => {
    setText('');
    setRows([]);
    setSelectedKeys([]);
  };

  const handleImport = () => {
    const chosen = rows.filter((r) => selectedKeys.includes(r.key));
    if (chosen.length === 0) {
      message.warning('请至少勾选一条记录');
      return;
    }
    setImporting(true);
    let added = 0;
    let updated = 0;
    // 本次导入的值 → 全局历史池（循环里先攒着，最后一次性落盘）
    const historyEntries: Array<readonly [string, string]> = [];
    // 反馈时间默认取登记时间（= 本条导入落库的当天）：
    // 平台粘贴过来的行列里没有反馈时间，留空会让台账「反馈时间」整列为空，
    // 故默认填登记当天（本地日期，不能用 toISOString —— 那会因 UTC 偏移差一天），
    // 之后可在列表里点这一格，点一下就自动改成「当下」。
    const registerTime = toDateStr(new Date());

    for (const r of chosen) {
      // 「备注」列整列只放**一个调证状态**：把平台的两段状态折叠成一档
      // （报文状态为已发送 / 已反馈时以报文状态为准，否则取申请状态）。
      // 案件校验状态不再进备注 —— 备注列按业务只呈现进度档位，不塞标注串。
      const status = statusFromPlatform(r.applyStatus, r.messageStatus);

      // 平台这次带来的反馈信息：以最新录入为准
      const feedback = {
        [REQUEST_STATUS_FIELD]: status,
        feedbackDate: registerTime,
        feedbackPending: r.pending ?? 0,
        feedbackSuccess: r.success ?? 0,
        feedbackFail: r.fail ?? 0,
      };

      if (r.action === 'update' && r.existingId) {
        const prev = getMassRecordById(r.existingId);
        if (prev) {
          // 同一申请单号 = 同一份调证：**只刷新这三个字段**（调证状态 / 反馈时间 / 查控结果），
          // 申请人、申请事由、备注、协查单位等手填内容一概保留 —— 追加式更新，绝不整条覆盖。
          updateMassRecord(prev.id, { ...(prev.data || {}), ...feedback });
          updated++;
          const prevData = (prev.data || {}) as Record<string, unknown>;
          for (const id of HISTORY_FIELD_IDS) {
            const v = prevData[id];
            if (typeof v === 'string' && v) historyEntries.push([id, v]);
          }
          continue;
        }
        // 记录在「解析」之后被删掉了 → 退化为追加一条
      }

      // 追加新记录：不同申请单号一律视为不同调证，
      // 即使案件名称、编号完全相同也不合并（一人一案可能有多份调证）。
      // 字段结构与《资金查控情况登记台账（周五报送）》十列对齐：
      // 台账可解析到的列直接落库，申请人 / 申请事由 / 请求查控人待人工补充。
      const data = {
        // 案件（线索）信息
        caseNo: r.caseNo || '',
        caseName: r.caseName || '',
        caseSource: '工作发现',
        caseType: '',
        // 申请信息
        requestDate: r.requestDate || '',
        applyReason: '',
        applicant: '',
        requestNo: r.requestNo || '',
        controlType: r.controlType || '',
        requester: '',
        // 反馈结果：状态存独立字段（四档之一），备注留空交人工填写
        ...feedback,
        remarks: '',
        // 协查信息（台账之外的扩展字段）
        cooperateUnit: cooperateUnit || '',
        target: '',
        accountNo: '',
        platform: platform || '',
        timeRange: '',
        deliveredToUnit: '',
        deliveryStatus: '',
      };
      saveMassRecord('evidence-request', REQUEST_TAB_ID, data);
      added++;

      // 平台带来的业务键同步进全局历史池，供其它模块联想复用
      const row = data as unknown as Record<string, unknown>;
      for (const id of HISTORY_FIELD_IDS) {
        historyEntries.push([id, String(row[id] ?? '')]);
      }
    }
    // 收尾：把导入值并入全局历史池，并重建「案件/线索、嫌疑人」全局索引 ——
    // 导入的案件信息由此与手工录入的数据同等对待，全项目可联想、可自动填充。
    if (added + updated > 0) {
      recordFieldValues(historyEntries);
      rebuildGlobalIndexes();
    }
    setImporting(false);
    message.success(
      `已导入：新增 ${added} 条${updated > 0 ? `，更新 ${updated} 条（仅调证状态 / 反馈时间 / 查控结果）` : ''}`,
    );
    clearAll();
    onImported(added + updated);
  };

  const columns = [
    { title: '序号', dataIndex: 'seq', width: 56, render: (v: string) => v || '-' },
    { title: '案件（线索）名称', dataIndex: 'caseName', width: 190, ellipsis: true },
    { title: '案件编号', dataIndex: 'caseNo', width: 150, ellipsis: true },
    { title: '查控类型', dataIndex: 'controlType', width: 110, render: (v: string) => v || '-' },
    { title: '申请单号', dataIndex: 'requestNo', width: 160, ellipsis: true },
    { title: '申请时间', dataIndex: 'requestDate', width: 110 },
    {
      // 折叠后的调证状态（入库即为「备注」列的内容），导入前先让用户核对一眼
      title: '调证状态',
      width: 90,
      render: (_: unknown, r: RowWithKey) => statusFromPlatform(r.applyStatus, r.messageStatus) || '-',
    },
    {
      title: '反馈(未/成/败)',
      width: 120,
      render: (_: unknown, r: RowWithKey) => `${r.pending ?? 0}/${r.success ?? 0}/${r.fail ?? 0}`,
    },
    {
      // 新增 = 追加一条新记录；更新 = 同申请单号，只刷新状态/反馈时间/查控结果
      title: '导入方式',
      width: 96,
      render: (_: unknown, r: RowWithKey) =>
        r.action === 'update' ? <Tag color="blue">更新</Tag> : <Tag color="green">新增</Tag>,
    },
  ];

  return (
    <Modal
      title="从平台粘贴导入（调证登记）"
      open={open}
      onCancel={onClose}
      width={920}
      footer={[
        <Button key="clear" onClick={clearAll}>清空</Button>,
        <Button key="cancel" onClick={onClose}>关闭</Button>,
        <Button key="import" type="primary" loading={importing} onClick={handleImport} disabled={rows.length === 0}>
          导入选中（{selectedKeys.length}）
        </Button>,
      ]}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="从资金查控平台复制表格（某行或整页），粘贴到下方文本框，点“解析”自动生成调证登记。"
        description={
          <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
            · 不同<b>申请单号</b>一律<b>追加</b>为新记录 —— 即使案件名称、编号相同也不合并（一案可能有多份调证）；<br />
            · 同一<b>申请单号</b>只<b>更新</b>「调证状态 / 反馈时间 / 查控结果」三项（以本次平台数据为准），
            申请人、申请事由、备注、协查单位等手填内容保持不动，不会整条覆盖；<br />
            · 案件/线索归属与协查单位等仍需补充。
          </div>
        }
      />
      <Space style={{ display: 'flex', marginBottom: 12 }} wrap>
        <span style={{ color: 'var(--color-text-secondary)' }}>默认协查单位：</span>
        <Select
          allowClear placeholder="不预设"
          style={{ width: 160 }}
          value={cooperateUnit}
          onChange={setCooperateUnit}
          options={COOPERATE_UNITS.map((u) => ({ label: u, value: u }))}
        />
        <span style={{ color: 'var(--color-text-secondary)' }}>默认调证平台：</span>
        <Select
          allowClear placeholder="不预设"
          style={{ width: 160 }}
          value={platform}
          onChange={setPlatform}
          options={PLATFORMS.map((u) => ({ label: u, value: u }))}
        />
      </Space>
      <Input.TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="在此粘贴从调证平台复制的表格内容（支持浏览器复制的文本或 HTML）"
        autoSize={{ minRows: 5, maxRows: 12 }}
        style={{ marginBottom: 12, fontFamily: 'monospace' }}
      />
      <Space style={{ display: 'flex', marginBottom: 12 }}>
        <Button type="primary" ghost onClick={doParse}>解析</Button>
        {rows.length > 0 && (
          <Checkbox
            checked={selectedKeys.length === rows.length}
            onChange={(e) => setSelectedKeys(e.target.checked ? rows.map((r) => r.key) : [])}
          >
            全选 / 全不选（共 {rows.length} 条：新增 {rows.filter((r) => r.action === 'new').length} 条、更新 {rows.filter((r) => r.action === 'update').length} 条）
          </Checkbox>
        )}
      </Space>
      {rows.length === 0 ? (
        <Empty description="暂无解析结果" />
      ) : (
        <Table
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={{ y: 320 }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys),
          }}
        />
      )}
    </Modal>
  );
}
