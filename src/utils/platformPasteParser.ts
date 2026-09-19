// 平台粘贴解析器
// 将资金查控平台表格复制出来的文本（浏览器 TSV，或多行错位形态；也兼容 HTML 剪贴板）
// 解析为结构化记录，供「从平台粘贴导入」使用。
//
// 复制文本的典型形态（每条记录跨 3 行）：
//   ① \t序号\t操作链接文本\t申请状态\t报文状态\t案件校验状态\t案件编号(A+22位)\t
//   ② 案件名称（独占一行）
//   ③ 查控类型\t任务总数\t未反馈\t反馈成功\t反馈失败\t申请单号(22位)\t创建时间
// HTML 剪贴板会被规整为「一行一 <tr>」的等价 TSV，由同一套正则兜底。

export const CONTROL_TYPES = [
  '常规查询',
  '冻结申请',
  '继续冻结申请',
  '解除冻结申请',
] as const;

export type ControlType = (typeof CONTROL_TYPES)[number];

export interface ParsedPlatformRow {
  /** 序号（平台列表序号，仅用于预览排序） */
  seq?: string;
  /** 案件编号，形如 A3703231200002024065002 */
  caseNo?: string;
  /** 案件（线索）名称 */
  caseName?: string;
  /** 查控类型：常规查询 / 冻结申请 / 继续冻结申请 / 解除冻结申请 */
  controlType?: string;
  /** 申请单号（22 位数字） */
  requestNo?: string;
  /** 创建时间（取日期部分 yyyy-MM-dd） */
  requestDate?: string;
  /** 未反馈数 */
  pending?: number;
  /** 反馈成功数 */
  success?: number;
  /** 反馈失败数 */
  fail?: number;
  /** 申请状态（如 已审批） */
  applyStatus?: string;
  /** 报文状态（如 已发送） */
  messageStatus?: string;
  /** 案件校验状态（如 校验通过） */
  caseCheckStatus?: string;
}

const CASE_NO_RE = /A\d{16,24}/;
const REQ_NO_RE = /\d{16,24}/;
const TIME_RE = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/;

// 完整行（HTML 折叠形态）：案件编号 + 案件名称 + 查控类型 + 4 个数字 + 申请单号 + 时间
const FULL_ROW_RE =
  /(A\d{16,24})\s*([^\t\n]*?)\s*(常规查询|冻结申请|继续冻结申请|解除冻结申请)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d{16,24})\s+(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/;

// 明细行（多行错位形态③）：查控类型 + 4 个数字 + 申请单号 + 时间
const COUNTS_RE =
  /(常规查询|冻结申请|继续冻结申请|解除冻结申请)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d{16,24})\s+(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/;

// 起始行（多行错位形态①）：\t序号\t…\t案件编号
const START_RE = /^\s*(\d+)\t.*?(A\d{16,24})/;

function extractStatuses(line: string): Pick<ParsedPlatformRow, 'applyStatus' | 'messageStatus' | 'caseCheckStatus'> {
  const out: Pick<ParsedPlatformRow, 'applyStatus' | 'messageStatus' | 'caseCheckStatus'> = {};
  if (/已审批|已提交|待审批|审批中|审批拒绝/.test(line)) {
    const m = line.match(/(已审批|已提交|待审批|审批中|审批拒绝)/);
    if (m) out.applyStatus = m[1];
  }
  if (/已发送|已接收|发送失败|未发送|已反馈/.test(line)) {
    const m = line.match(/(已发送|已接收|发送失败|未发送|已反馈)/);
    if (m) out.messageStatus = m[1];
  }
  if (/校验通过|校验失败|未校验/.test(line)) {
    const m = line.match(/(校验通过|校验失败|未校验)/);
    if (m) out.caseCheckStatus = m[1];
  }
  return out;
}

/** 将 HTML 剪贴板内容规整为 TSV 文本（一行一个 <tr>）；非浏览器环境或解析失败则原样返回文本部分。 */
function normalizeHtml(html: string): string {
  if (!/<\s*table/i.test(html)) return html;
  try {
    const root: Document =
      typeof DOMParser !== 'undefined'
        ? new DOMParser().parseFromString(html, 'text/html')
        : (undefined as unknown as Document);
    if (!root) return html.replace(/<[^>]+>/g, ' ');
    const rows = Array.from(root.querySelectorAll('tr'));
    const lines = rows.map((tr) => {
      const cells = Array.from(tr.querySelectorAll('td,th')).map((c) => (c.textContent || '').trim());
      return cells.join('\t');
    });
    return lines.join('\n');
  } catch {
    return html.replace(/<[^>]+>/g, ' ');
  }
}

/**
 * 解析平台复制文本 → 结构化记录数组。
 * 解析失败或不完整（缺申请单号/时间）的行会被跳过，避免脏数据入库。
 */
export function parsePlatformPaste(rawText: string): ParsedPlatformRow[] {
  if (!rawText || !rawText.trim()) return [];
  const text = normalizeHtml(rawText);
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));

  const out: ParsedPlatformRow[] = [];
  let pending: ParsedPlatformRow | null = null;
  let caseNameBuf: string[] = [];

  const flush = () => {
    if (pending) {
      const row = { ...pending };
      const name = caseNameBuf.join(' ').trim();
      if (name) row.caseName = name;
      // 不完整记录（缺申请单号或时间）丢弃，避免脏数据入库
      if (row.requestNo && row.requestDate) out.push(row);
    }
    pending = null;
    caseNameBuf = [];
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    // 跳过表头 / 子表头
    if (/序号|案件校验状态|^\s*任务\s*未反馈|查控类型\s*未反馈/.test(line)) continue;

    // 1) 完整行（HTML 折叠形态）
    const full = line.match(FULL_ROW_RE);
    if (full) {
      const row: ParsedPlatformRow = {
        caseNo: full[1],
        caseName: full[2].trim() || undefined,
        controlType: full[3],
        pending: Number(full[5]),
        success: Number(full[6]),
        fail: Number(full[7]),
        requestNo: full[8],
        requestDate: full[9].replace('T', ' ').slice(0, 10),
        ...extractStatuses(line),
      };
      const seq = line.match(/^\s*(\d+)\D/);
      if (seq) row.seq = seq[1];
      out.push(row);
      pending = null;
      caseNameBuf = [];
      continue;
    }

    // 2) 起始行（多行错位形态①）
    const start = line.match(START_RE);
    if (start) {
      flush();
      const row: ParsedPlatformRow = {
        seq: start[1],
        caseNo: start[2],
        ...extractStatuses(line),
      };
      pending = row;
      caseNameBuf = [];
      continue;
    }

    // 3) 明细行（多行错位形态③）
    const counts = line.match(COUNTS_RE);
    if (counts) {
      if (pending) {
        pending.controlType = counts[1];
        pending.pending = Number(counts[3]);
        pending.success = Number(counts[4]);
        pending.fail = Number(counts[5]);
        pending.requestNo = counts[6];
        pending.requestDate = counts[7].replace('T', ' ').slice(0, 10);
        flush();
      } else {
        // 没有起始行的零散明细：尽力补全
        const row: ParsedPlatformRow = {
          controlType: counts[1],
          pending: Number(counts[3]),
          success: Number(counts[4]),
          fail: Number(counts[5]),
          requestNo: counts[6],
          requestDate: counts[7].replace('T', ' ').slice(0, 10),
        };
        out.push(row);
      }
      continue;
    }

    // 4) 其余文本行：多行错位形态②（案件名称）
    if (pending) {
      caseNameBuf.push(line.trim());
    }
  }
  flush();

  return out;
}

/** 是否包含平台复制特征（用于在 UI 上提示“是否粘贴了平台数据”） */
export function looksLikePlatformPaste(text: string): boolean {
  return CASE_NO_RE.test(text) && (REQ_NO_RE.test(text) || TIME_RE.test(text));
}
