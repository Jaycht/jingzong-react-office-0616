// 模块配置 - 字段定义辅助
import type { FieldDefinition, FieldType } from './types';

const f = (id: string, label: string, type: FieldType = 'text', required = false, options?: string[], customOptionKey?: string, multiple?: boolean): FieldDefinition => ({
  id,
  label,
  type,
  required,
  options,
  customOptionKey,
  multiple,
});

const section = (label: string, repeatable = false, listName?: string): FieldDefinition => ({
  id: __section_,
  label,
  type: 'section',
  repeatable,
  listName,
});

const commonTail = [
  f('handler', '经办人', 'text', false),
  f('attachment', '附件材料', 'attachment'),
];

export function fieldsFor(moduleId: string, tab: string): FieldDefinition[] {
  if (moduleId === 'office-finance-assets') {
    const map: Record<string, FieldDefinition[]> = {
      经费报账: [
        f('expenseCategory', '报账类目', 'select', false, ['办公经费', '差旅费', '业务经费', '其他经费'], 'office.expenseCategory'),
        f('handler', '经办人', 'text', false),
        f('traveler', '出差人'),
        f('caseName', '经办案件'),
        f('fundCategory', '经费类目', 'select', false, ['案件办理', '外调取证', '研判分析', '宣传防范', '其他'], 'office.fundCategory'),
        f('expenseDate', '报账日期', 'date', false),
        f('amount', '报账金额（元）', 'number', false),
        f('summary', '用途摘要', 'textarea', false),
        f('reimburseStatus', '报销状态', 'select', false, ['已报销', '待报销']),
        f('attachment', '附件材料', 'attachment'),
      ],
      党费管理: [f('partyMember', '党员姓名', 'text', false), f('period', '缴纳月份', 'select', false, ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']), f('amount', '缴纳金额（元）', 'number', false), f('payMethod', '缴纳方式', 'select', false, ['现金', '转账', '代扣']), f('publicity', '公示情况', 'textarea'), ...commonTail],
      公务往来: [f('contactObject', '往来对象', 'text', false), f('matterDate', '发生时间', 'date', false), f('reason', '往来事由', 'textarea', false), f('standard', '执行标准'), f('participants', '相关人员'), ...commonTail],
      福利发放: [f('benefitName', '福利名称', 'text', false), f('standard', '发放标准'), f('grantDate', '发放时间', 'date', false), f('recipients', '发放名单', 'textarea', false), f('signStatus', '领取签字情况'), ...commonTail],
      物资采购: [f('itemName', '物资名称', 'text', false), f('spec', '规格型号'), f('quantity', '数量', 'number', false), f('unitPrice', '单价（元）', 'number'), f('supplier', '供应商'), f('acceptance', '验收情况', 'textarea'), ...commonTail],
      固定资产: [f('assetName', '资产名称', 'text', false), f('assetNo', '资产编号'), f('actionType', '登记类型', 'select', false, ['购置', '领用', '维修', '报废']), f('responsiblePerson', '责任人'), f('actionDate', '发生日期', 'date', false), f('details', '情况说明', 'textarea'), ...commonTail],
    };
    return map[tab] || map.经费报账;
  }

  if (moduleId === 'office-cluster') {
    return [
      f('battleName', '战役名称', 'text', false),
      f('battleNo', '战役编号', 'text', false),
      f('battleType', '战役类型', 'select', false, ['集群', '协同', '协查']),
      f('issueDate', '下发日期', 'date', false),
      f('distribution', '分发情况', 'textarea', false),
      f('result', '战果', 'textarea'),
      f('feedbackStatus', '是否反馈', 'select', false, ['已反馈', '未反馈']),
      f('feedbackDate', '反馈日期', 'date'),
      f('feedbackFile', '反馈材料', 'attachment'),
    ];
  }

  return [];
}

export { f, section, commonTail };
