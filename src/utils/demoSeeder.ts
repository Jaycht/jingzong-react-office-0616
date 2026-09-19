/**
 * 演示数据生成器（V2.50.0）
 *
 * 目的：方便测试与演示 —— 逐个手工录入 5 科室 / 23 模块 / 44 个页签 太费时间，
 * 这里按每个页签的**真实字段定义**生成贴合业务的示例条目（日期落在近三个月、
 * 金额/人名/单位/编号等按字段语义取值）；**可重复段**（嫌疑人信息、涉众主体、
 * 报案人、调证清单这类「可多次添加」的结构）同样会生成多条，否则无法测试
 * 新增 / 逐条删除 / 折叠展开这些交互。调证登记另按台账口径生成申请单，
 * 日常随手记生成几篇工作日志。
 *
 * 两条硬约束：
 * 1. **脱敏**：所有人员姓名一律「姓 + 某某」，公司名称去掉真实品牌只留行业属性，
 *    案件名称里的当事人同样以某某代替 —— 演示数据里不出现真实姓名与真实企业名。
 * 2. **标记在记录顶层**（`MassRecord.demo`），不写进 data：写到 data 里会被
 *    「遍历 data 展示字段」的时间轴 / 案件详情当成业务字段显示出来（V2.49.0 的
 *    `__demo` 就是这么漏到界面上的）。带标记的记录不参与到期预警。
 *
 * 写入后统一调 rebuildGlobalIndexes()，让演示的案件/线索/嫌疑人也进入全局联动池，
 * 从而能演示「选案件名自动填充编号」这类跨模块效果。
 */
import { getBaseModules } from '../moduleConfig';
import type { FieldDefinition } from '../moduleConfig/types';
import {
  saveMassRecord,
  getMassRecords,
  deleteMassRecords,
  rebuildGlobalIndexes,
  isDemoRecord,
  type MassRecordData,
} from '../store/massStore';
import { createDailyNote, getDailyNotes, deleteDailyNote } from '../store/dailyNotesStore';

/** 旧版演示标记（V2.49.0 写在 data 里）。仅用于读取兼容，新数据不再写入 data。 */
export const DEMO_FLAG = '__demo';
export const DEMO_FLAG_VALUE = 'v1';

export const DEMO_NOTE = '本条为演示数据，可随时删除';

// ─── 脱敏词库 ─────────────────────────────────────────
/** 姓氏池：人员姓名一律「姓 + 某某」 */
const SURNAMES = [
  '张', '李', '王', '刘', '陈', '赵', '孙', '周', '吴', '郑', '冯', '韩',
  '徐', '朱', '马', '高', '林', '何', '郭', '罗', '宋', '齐', '沈', '谢',
];

/** 人员姓名脱敏：张某某 / 李某某 / …（同一条记录内多人时姓不同，便于区分） */
function anonName(seq: number): string {
  return `${SURNAMES[Math.abs(seq) % SURNAMES.length]}某某`;
}

/** 案件名称：当事人以「姓 + 某某」呈现，不出现真实案件当事人姓名 */
const CASE_NAMES = [
  '12.22串通投标案',
  '宋某某非法吸收公众存款案',
  '张某某非法经营案',
  '高某某非法吸收公众存款案',
  '齐某某职务侵占案',
  '某企业虚开增值税专用发票案',
  '某系列合同诈骗案',
];
const CLUE_NAMES = [
  '某企业资金异常往来线索',
  '群众举报非法集资线索',
  '银行反洗钱可疑交易线索',
  '涉税异常发票线索',
];
const CASE_NOS = ['A3703666202600012', 'A3703666202600027', 'A3703666202600031', 'A3703666202600044'];
/** 公司名称脱敏：只保留行业属性，去掉真实品牌与字号 */
const COMPANIES = [
  '某置业有限公司',
  '某电器销售有限公司',
  '某商贸有限公司',
  '某物资有限公司',
  '某物流有限公司',
  '某建筑安装有限公司',
  '某科技服务有限公司',
];
const UNITS = [
  '沂源县公安局经侦大队', '涉众办主任室', '法制室', '一中队', '二中队', '三中队',
  '城区派出所', '南麻派出所', '悦庄派出所', '刑警大队', '治安大队',
];
const BANKS = ['中国工商银行沂源支行', '中国农业银行沂源支行', '中国银行沂源支行', '山东农村商业银行沂源支行', '中国建设银行沂源支行'];
const ADDRESSES = ['沂源县历山街道办鲁山路 12 号', '沂源县南麻街道办振兴路 88 号', '沂源县悦庄镇政府街 5 号', '沂源县鲁村镇府前街 26 号'];
/** 设备型号脱敏：不出现具体品牌与机型 */
const DEVICES = ['某品牌手机（安卓）', '某品牌手机（iOS）', '某品牌平板电脑', '某品牌笔记本电脑'];
const CONTENTS = [
  '对涉案账户近三个月流水进行梳理，标注大额往来与可疑交易。',
  '走访当事人核实资金往来背景，制作询问笔录并固定相关证据。',
  '汇总外地协查单位反馈材料，逐笔核对涉案资金去向。',
  '调取涉案公司工商登记与账目资料，核对股东出资与经营情况。',
  '梳理举报材料中的线索要点，形成初步核查报告。',
];

interface Ctx {
  moduleLabel: string;
  tabLabel: string;
  index: number;
  seq: number;
}

// ─── 小工具 ───────────────────────────────────────────
/** 本地日期字符串（yyyy-MM-dd），与项目日期口径一致，禁用 toISOString 以免时区差一天 */
function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function pick<T>(arr: readonly T[], seq: number): T {
  return arr[Math.abs(seq) % arr.length];
}

function fakePhone(seq: number): string {
  return `1${pick(['37', '38', '39', '58', '86', '89'], seq)}${String(10000000 + (seq * 137) % 89999999).slice(0, 8)}`;
}

function fakeIdCard(seq: number): string {
  const year = 1970 + (seq % 30);
  const month = String((seq % 12) + 1).padStart(2, '0');
  const day = String((seq % 27) + 1).padStart(2, '0');
  return `370323${year}${month}${day}${String(1000 + (seq * 37) % 8999)}`;
}

function fakeAccount(seq: number): string {
  return `6222${String(1000000000 + (seq * 7919) % 8999999999)}`.slice(0, 19);
}

function fakeRequestNo(seq: number): string {
  return `DZ2026${String(100 + seq).slice(-4)}${String(1000 + (seq * 13) % 8999)}`;
}

// ─── 字段取值 ─────────────────────────────────────────
/**
 * 按字段语义生成示例值。匹配顺序从「具体」到「宽泛」，避免「案件名称」被当成普通文本。
 */
function textFor(fd: FieldDefinition, ctx: Ctx): string {
  const key = `${fd.id} ${fd.label}`;
  const long = fd.type === 'textarea';

  // 身份证
  if (/身份证|证件号/.test(key)) return fakeIdCard(ctx.seq);
  // 电话/手机
  if (/手机|电话|联系方式/.test(key)) return fakePhone(ctx.seq);
  // 银行账号
  if (/银行账号|账号|卡号|账户/.test(key)) return fakeAccount(ctx.seq);
  // 编号类（案件/线索/受案）
  if (/案件编号|线索编号|受案编号|caseNo|clueNo/i.test(key)) return pick(CASE_NOS, ctx.seq);
  // 单号/文号
  if (/申请单号|文书号|单号|文号|编号|documentNo|docNo/i.test(key)) return fakeRequestNo(ctx.seq);
  // 金额
  if (/金额|经费|数额|价款|预算|费用|工资|报销|罚没/.test(key)) {
    return String(12000 + (ctx.seq * 3571) % 480000);
  }
  // 数量
  if (/人数|数量|条数|次数|份数|个数/.test(key)) return String(2 + (ctx.seq % 18));
  // 归属行 / 银行
  if (/归属行|支行|开户行/.test(key)) return pick(BANKS, ctx.seq);
  // 案件 / 线索名称（须先于「名称」通用规则）
  if (/线索名|线索（|线索\(/.test(key)) return pick(CLUE_NAMES, ctx.seq);
  if (/案件名|案件（线索）名称|案由|案件\b/.test(key)) return pick(CASE_NAMES, ctx.seq);
  // 单位 / 部门 / 公司
  if (/公司|企业/.test(key)) return pick(COMPANIES, ctx.seq);
  if (/单位|部门|科室|支队|大队|派出所|机构|协查/.test(key)) return pick(UNITS, ctx.seq);
  // 人员姓名（一律脱敏）
  if (/嫌疑人|报案人|申请人|经办人|负责人|持有人|当事人|姓名|民警|经办|审查人|审批人|交办人|请求查控人|送达人|接收人|对象|人$/.test(key)) {
    return anonName(ctx.seq);
  }
  // 地址
  if (/地址|地点|场所|住址|位置/.test(key)) return pick(ADDRESSES, ctx.seq);
  // 设备
  if (/设备|型号|品牌/.test(key)) return pick(DEVICES, ctx.seq);
  // 状态类
  if (/状态|结果|是否|进度/.test(key)) return long ? '已完成，材料已归档' : '已完成';
  // 长文本类（内容/情况/说明/…）
  if (long || /内容|情况|说明|描述|事由|摘要|详情|意见|建议|措施|经过|反馈|正文|事项|要求|进展|要点|总结/.test(key)) {
    return pick(CONTENTS, ctx.seq) + `（${ctx.tabLabel}·示例${ctx.index + 1}）`;
  }
  // 其余文本：带上页签名，保证列表第一列可读
  if (fd.required || /名称|标题|主题/.test(key)) {
    return `${ctx.tabLabel}·示例${ctx.index + 1}`;
  }
  return `${fd.label}信息${ctx.index + 1}`;
}

/** 按字段定义生成一个示例值；附件字段不生成（避免指向不存在的文件） */
function valueFor(fd: FieldDefinition, ctx: Ctx): unknown {
  if (fd.type === 'attachment') return undefined;
  if (fd.type === 'select') {
    if (fd.options && fd.options.length > 0) return pick(fd.options, ctx.seq);
    return '已办结';
  }
  if (fd.type === 'number') {
    if (/金额|经费|数额|预算|罚没/.test(`${fd.id} ${fd.label}`)) return 12000 + (ctx.seq * 3571) % 480000;
    return 2 + (ctx.seq % 18);
  }
  if (fd.type === 'date') {
    // 分散在近三个月内，且让「时间范围」类字段看起来有先后
    return dateStr((ctx.index * 9 + ctx.seq) % 88);
  }
  return textFor(fd, ctx);
}

/**
 * 收集「位于可重复段内」的字段 id。
 * 这些字段的真实归属是段对应的数组（listName），不能写进记录主表 ——
 * 抽屉保存时就是这么存的（formData[listName] = [...]），
 * 演示数据必须与之一致，否则「段内字段」在主表与数组里各有一份、互相打架。
 */
function sectionFieldIds(fields: FieldDefinition[]): Set<string> {
  const ids = new Set<string>();
  let inRepeat = false;
  for (const fd of fields) {
    if (fd.type === 'section') { inRepeat = !!fd.repeatable; continue; }
    if (inRepeat) ids.add(fd.id);
  }
  return ids;
}

/** 拆出所有可重复段：[listName, 段内字段] */
function repeatableSections(fields: FieldDefinition[]): Array<{ listName: string; fields: FieldDefinition[] }> {
  const out: Array<{ listName: string; fields: FieldDefinition[] }> = [];
  let cur: { listName: string; fields: FieldDefinition[] } | null = null;
  for (const fd of fields) {
    if (fd.type === 'section') {
      cur = fd.repeatable && fd.listName ? { listName: fd.listName, fields: [] } : null;
      if (cur) out.push(cur);
      continue;
    }
    cur?.fields.push(fd);
  }
  return out;
}

/**
 * 每个可重复段生成几条。
 * 嫌疑人信息 / 涉众主体这类「可多次添加」的结构必须有数据，
 * 否则没法测试新增、折叠展开、逐条删除这些交互。
 */
export const DEMO_ITEMS_PER_SECTION = 2;

/** 生成段内一条（嫌疑人/主体的一条记录） */
function buildItem(fields: FieldDefinition[], ctx: Ctx): MassRecordData {
  const item: MassRecordData = {};
  for (const fd of fields) {
    if (fd.type === 'section') continue;
    const v = valueFor(fd, ctx);
    if (v !== undefined) item[fd.id] = v;
  }
  return item;
}

/** 生成一条完整记录的 data（主表字段 + 可重复段数组，跳过段内字段与段分隔符） */
function buildData(fields: FieldDefinition[], ctx: Ctx): MassRecordData {
  const data: MassRecordData = {};
  const inner = sectionFieldIds(fields);

  for (const fd of fields) {
    if (fd.type === 'section' || inner.has(fd.id)) continue;
    const v = valueFor(fd, ctx);
    if (v !== undefined) data[fd.id] = v;
  }

  for (const sec of repeatableSections(fields)) {
    const items: MassRecordData[] = [];
    for (let k = 0; k < DEMO_ITEMS_PER_SECTION; k++) {
      // seq 拉开步长，保证同一段内多人的姓名/证件号/电话各不相同
      items.push(buildItem(sec.fields, { ...ctx, seq: ctx.seq + k * 5, index: k }));
    }
    data[sec.listName] = items;
  }

  return data;
}

/**
 * 调证登记专用：字段与《资金查控情况登记台账（周五报送）》十列对齐，
 * 让列表（11 列）与导出台账都能看到像样的申请单。
 */
function buildRequestData(fields: FieldDefinition[], ctx: Ctx): MassRecordData {
  const data = buildData(fields, ctx);
  const success = 120 + (ctx.seq * 37) % 1800;
  const fail = ctx.seq % 7;
  return {
    ...data,
    requestNo: fakeRequestNo(ctx.seq),
    applyReason: pick(['刑警专案查询', '政保查询', '专案资金查询', '涉众案件资金核实'], ctx.seq),
    applicant: anonName(ctx.seq),
    requester: anonName(ctx.seq + 3),
    controlType: pick(['常规查询', '冻结申请', '继续冻结申请', '解除冻结申请'], ctx.seq),
    requestDate: dateStr(20 + ctx.index * 6),
    feedbackDate: dateStr(6 + ctx.index * 3),
    feedbackPending: ctx.seq % 3,
    feedbackSuccess: success,
    feedbackFail: fail,
    requestStatus: pick(['已提交', '已审批', '已发送', '已反馈'], ctx.seq),
    remarks: DEMO_NOTE,
    platform: pick(['经侦云', '警综平台'], ctx.seq),
    cooperateUnit: pick(UNITS, ctx.seq),
  };
}

// ─── 日常随手记 ───────────────────────────────────────
const DEMO_NOTES: Array<{ title: string; type: string; priority: 'normal' | 'important' | 'urgent'; contents: string[] }> = [
  {
    title: '走访涉案公司核实经营情况',
    type: '调查取证',
    priority: 'normal',
    contents: ['上午赴涉案公司调取工商登记与账目资料', '与公司负责人谈话并制作询问笔录', '登记带回材料 3 份，已交内勤归档'],
  },
  {
    title: '参加大队周例会并领取任务分工',
    type: '会议',
    priority: 'important',
    contents: ['汇报本周案件进展与下周计划', '领取资金分析任务，责任人到人', '会后落实任务清单并反馈'],
  },
  {
    title: '梳理涉案账户流水并标注可疑交易',
    type: '一般工作',
    priority: 'normal',
    contents: ['导出 6 个涉案账户近三个月流水', '按金额阈值筛出可疑交易 27 笔', '形成初步资金流向图待复核'],
  },
  {
    title: '限期反馈上级交办线索核查情况',
    type: '其他',
    priority: 'urgent',
    contents: ['核对交办线索中的 5 项要点', '补齐缺失材料并向法制室报审', '今日下班前将核查报告报上报'],
  },
];

function seedDailyNotes(): number {
  let n = 0;
  DEMO_NOTES.forEach((it, i) => {
    createDailyNote({
      date: dateStr(i),
      title: it.title,
      type: it.type,
      priority: it.priority,
      contents: it.contents,
      notes: DEMO_NOTE,
      demo: true,
    });
    n++;
  });
  return n;
}

// ─── 对外接口 ─────────────────────────────────────────
export interface SeedResult {
  /** 生成的业务记录条数 */
  records: number;
  /** 覆盖的页签数 */
  tabs: number;
  /** 生成的可重复段条目数（嫌疑人 / 涉众主体等） */
  sectionItems: number;
  /** 生成的随手记条数 */
  notes: number;
}

/** 每个页签生成几条（调证登记固定 3 条，凑出不同状态） */
export const DEFAULT_PER_TAB = 2;

/** 一键生成演示数据 */
export function seedDemoData(perTab: number = DEFAULT_PER_TAB): SeedResult {
  const modules = getBaseModules();
  let records = 0;
  let tabs = 0;
  let sectionItems = 0;
  let seq = 0;

  for (const mod of modules) {
    for (const tab of mod.tabs) {
      const fields = tab.fields || [];
      if (fields.filter((fd) => fd.type !== 'section').length === 0) continue;
      // 该页签每个可重复段落生成几条（用于统计展示）
      const perSection = repeatableSections(fields).length * DEMO_ITEMS_PER_SECTION;
      tabs++;
      const count = mod.id === 'evidence-request' ? 3 : perTab;
      for (let i = 0; i < count; i++) {
        const ctx: Ctx = { moduleLabel: mod.label, tabLabel: tab.label, index: i, seq: seq++ };
        const data = mod.id === 'evidence-request'
          ? buildRequestData(fields, ctx)
          : buildData(fields, ctx);
        saveMassRecord(mod.id, tab.id, data, { demo: true });
        records++;
        sectionItems += perSection;
      }
    }
  }

  const notes = seedDailyNotes();
  // 批量写入后必须重建全局索引，演示的案件/线索/嫌疑人才会在其它模块可见
  rebuildGlobalIndexes();
  return { records, tabs, sectionItems, notes };
}

/** 统计当前库里的演示数据条数 */
export function countDemoData(): { records: number; notes: number } {
  const records = getMassRecords().filter((r) => isDemoRecord(r)).length;
  const notes = getDailyNotes().filter((n) => n.demo).length;
  return { records, notes };
}

/** 清除全部演示数据（只删带标记的，真实数据不受影响） */
export function clearDemoData(): { records: number; notes: number } {
  const ids = getMassRecords()
    .filter((r) => isDemoRecord(r))
    .map((r) => r.id);
  if (ids.length > 0) deleteMassRecords(ids);

  const notes = getDailyNotes().filter((n) => n.demo);
  notes.forEach((n) => deleteDailyNote(n.id));

  rebuildGlobalIndexes();
  return { records: ids.length, notes: notes.length };
}
