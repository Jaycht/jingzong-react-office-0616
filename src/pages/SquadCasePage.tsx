import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Modal, Form, Input, InputNumber, Select, DatePicker, Dropdown } from 'antd';
import { Plus, Search, BriefcaseBusiness, FileText, Download } from 'lucide-react';
import { useAppStore } from "../store/appStore"
import { exportModuleReport } from "../utils/reportGenerator";
import { findModule } from "../moduleConfig";
import { getCases, saveCase, type SquadCase } from '../store/caseStore';

const CASE_TYPES = [
  '帮助恐怖活动案', '走私假币案', '虚报注册资本案',
  '虚假出资、抽逃出资案', '欺诈发行股票、债券案', '违规披露、不披露重要信息案',
  '妨害清算案', '隐匿、故意销毁会计凭证、会计账簿、财务会计报告案',
  '虚假破产案', '非国家工作人员受贿案', '对非国家工作人员行贿案',
  '对外国公职人员、国际公共组织官员行贿案', '背信损害上市公司利益案',
  '伪造货币案', '出售、购买、运输假币案',
  '金融工作人员购买假币、以假币换取货币案', '持有、使用假币案',
  '变造货币案', '擅自设立金融机构案',
  '伪造、变造、转让金融机构经营许可证、批准文件案', '高利转贷案',
  '骗取贷款、票据承兑、金融票证案', '非法吸收公众存款案',
  '伪造、变造金融票证案', '妨害信用卡管理案', '窃取、收买、非法提供信用卡信息案',
  '伪造、变造国家有价证券案', '伪造、变造股票、公司、企业债券案',
  '擅自发行股票、公司、企业债券案', '内幕交易、泄露内幕信息案',
  '利用未公开信息交易案', '编造并传播证券、期货交易虚假信息案',
  '诱骗投资者买卖证券、期货合约案', '操纵证券、期货市场案',
  '背信运用受托财产案', '违法运用资金案', '违法发放贷款案',
  '吸收客户资金不入账案', '违规出具金融票证案', '对违法票据承兑、付款、保证案',
  '骗购外汇案', '逃汇案', '洗钱案', '集资诈骗案', '贷款诈骗案',
  '票据诈骗案', '金融凭证诈骗案', '信用证诈骗案', '信用卡诈骗案',
  '有价证券诈骗案', '保险诈骗案', '逃税案', '抗税案', '逃避追缴欠税案',
  '骗取出口退税案', '虚开增值税专用发票、用于骗取出口退税、抵扣税款发票案',
  '虚开发票案', '伪造、出售伪造的增值税专用发票案', '非法出售增值税专用发票案',
  '非法购买增值税专用发票、购买伪造的增值税专用发票案',
  '非法制造、出售非法制造的用于骗取出口退税、抵扣税款发票案',
  '非法制造、出售非法制造的发票案', '非法出售用于骗取出口退税、抵扣税款发票案',
  '非法出售发票案', '持有伪造的发票案', '损害商业信誉、商品声誉案',
  '虚假广告案', '串通投标案', '合同诈骗案', '组织、领导传销活动案',
  '非法经营案', '非法转让、倒卖土地使用权案', '提供虚假证明文件案',
  '出具证明文件重大失实案', '职务侵占案', '挪用资金案', '虚假诉讼案',
];

const CASE_SOURCES = ['群众报案', '举报', '上级交办', '部门移送', '专项行动', '工作发现'];


const stageStyle = (active: boolean) => ({
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: 4,
  padding: '3px 8px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 600,
  background: active ? '#EBF5FF' : '#F3F4F6',
  color: active ? '#155A8A' : '#9CA3AF',
  whiteSpace: 'nowrap' as const,
});

export default function SquadCasePage() {
    const showToast = useAppStore((s) => s.showToast);
  const [cases, setCases] = useState<SquadCase[]>([]);
  const [searchVal, setSearchVal] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    setCases(getCases());
  }, []);

  const refresh = () => setCases(getCases());

  const handleCreate = () => {
    form.validateFields().then((values) => {
      const newCase = saveCase(values);
      showToast(`案件 ${newCase.caseName} 已创建`, 'success');
      setModalOpen(false);
      form.resetFields();
      refresh();
    }).catch(() => {
      showToast('请补充必填字段', 'warning');
    });
  };

  const filtered = cases.filter((c) =>
    !searchVal || c.caseName?.includes(searchVal) || c.caseNo?.includes(searchVal)
  );

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 8, background: 'linear-gradient(135deg, #0F3A5F, #155A8A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(15,58,95,.24)' }}>
          <BriefcaseBusiness size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#172033' }}>中队案件管理</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>案件中队 · 案件进度展示</div>
        </div>
      </motion.div>

      {/* New Case Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{
          background: 'linear-gradient(135deg, #E6F1F8, #F8FBFD)',
          border: '1px solid #B9D4E6',
          borderLeft: '4px solid #155A8A',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 6px 18px rgba(21,90,138,.08)',
        }}
      >
        <Button
          type="primary"
          size="large"
          icon={<Plus size={16} />}
          onClick={() => setModalOpen(true)}
          style={{ height: 42, paddingInline: 22, boxShadow: '0 8px 20px rgba(21,90,138,.25)', flexShrink: 0 }}
        >
          新建案件
        </Button>
          <Dropdown
            menu={{
              items: [
                { key: 'daily', icon: <FileText size={13} />, label: '生成日报' },
                { key: 'weekly', icon: <FileText size={13} />, label: '生成周报' },
                { key: 'monthly', icon: <FileText size={13} />, label: '生成月报' },
              ],
              onClick: ({ key }) => {
                const mod = findModule('squad-case');
                if (!mod) return;
                setReporting(true);
                try {
                  exportModuleReport(mod, key as any);
                  showToast('正在导出' + mod.label + '的' + (key === 'daily' ? '日报' : key === 'weekly' ? '周报' : '月报'));
                } catch (err: any) {
                  showToast(err.message || '导出失败', 'error');
                } finally {
                  setReporting(false);
                }
              },
            }}
            placement="bottomLeft"
          >
            <Button
              type="primary"
              icon={<FileText size={16} />}
              loading={reporting}
              style={{ height: 42, paddingInline: 18, background: '#0F766E', borderColor: '#0F766E', flexShrink: 0 }}
            >
              生成报告
            </Button>
          </Dropdown>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#123852' }}>创建新案件</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>点击左侧按钮进入新建案件登记窗口，填写案件基础信息。</div>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {[
          ['案件总数', String(cases.length), '#155A8A'],
          ['侦查中', String(cases.filter(c => !c.caseCloseDate).length), '#D97706'],
          ['已结案', String(cases.filter(c => c.caseCloseDate).length), '#0F766E'],
          ['本月新增', String(cases.filter(c => c.createdAt?.startsWith(new Date().toISOString().slice(0, 7))).length), '#DC2626'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #D8E1EA', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div style={{ background: '#fff', border: '1px solid #D8E1EA', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #EDF2F7' }}>
          <Input
            prefix={<Search size={14} color="#94A3B8" />}
            placeholder="搜索案件名称或编号..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{ width: 320 }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['案件编号', '受/立案文书号', '案件名称', '案件来源', '案件类型', '涉案总金额(万)', '主办民警', '受案日期', '立案日期', '侦查终结', '移送起诉', '结案'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#64748B', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>暂无案件，点击右上角"新建案件"创建</td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid #F1F5F9' }}
                  >
                    <td style={{ padding: '10px 12px', minWidth: 140 }}>{c.caseNo || '-'}</td>
                    <td style={{ padding: '10px 12px', minWidth: 120 }}>{c.filingDocNo || '-'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, minWidth: 160 }}>{c.caseName || '-'}</td>
                    <td style={{ padding: '10px 12px', minWidth: 80 }}>{c.caseSource || '-'}</td>
                    <td style={{ padding: '10px 12px', minWidth: 140, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.caseType || '-'}</td>
                    <td style={{ padding: '10px 12px', minWidth: 80 }}>
                      {c.totalAmount ? `${c.totalAmount}万` : '-'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{c.leadOfficer || '-'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={stageStyle(Boolean(c.receiveDateShow))}>
                        {c.receiveDateShow || '待填'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={stageStyle(Boolean(c.filingDateShow))}>
                        {c.filingDateShow || '待填'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={stageStyle(Boolean(c.investEndDate))}>
                        {c.investEndDate || '待填'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={stageStyle(Boolean(c.prosecutionDate))}>
                        {c.prosecutionDate || '待填'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <span style={stageStyle(Boolean(c.caseCloseDate))}>
                        {c.caseCloseDate ? '已结案' : '进行中'}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid #EDF2F7', fontSize: 12, color: '#94A3B8' }}>
          共 {filtered.length} 条案件记录
        </div>
      </div>

      {/* New Case Modal */}
      <Modal
        open={modalOpen}
        width={960}
        closable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>新建案件</span>
            <div
              onClick={() => { setModalOpen(false); form.resetFields(); }}
              style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6,
                background: '#F3F4F6',
                color: '#6B7280',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all .15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#E5E7EB'; (e.currentTarget as HTMLDivElement).style.color = '#374151'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLDivElement).style.color = '#6B7280'; }}
            >
              ✕
            </div>
          </div>
        }
        maskClosable={false}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        centered
        styles={{ body: { maxHeight: '72vh', overflow: 'auto', padding: 0 } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); }} style={{ height: 36, paddingInline: 18 }}>取消</Button>
            <Button type="primary" icon={<Plus size={14} />} onClick={handleCreate} style={{ height: 36, paddingInline: 20 }}>创建案件</Button>
          </div>
        }
      >
        <div style={{ padding: '20px 24px' }}>
        <Form form={form} layout="vertical" requiredMark="optional" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          <Form.Item name="caseNo" label="案件编号" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
            <Input placeholder="A3703231200002026******" />
          </Form.Item>
          <Form.Item name="filingDocNo" label="受/立案文书号" style={{ marginBottom: 12 }}>
            <Input placeholder="文书编号" />
          </Form.Item>
          <Form.Item name="caseName" label="案件名称" rules={[{ required: true }]} style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
            <Input placeholder="请输入案件名称" />
          </Form.Item>
          <Form.Item name="caseSource" label="案件来源" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
            <Select placeholder="选择来源">
              {CASE_SOURCES.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="caseType" label="案件类型" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
            <Select placeholder="选择案件类型" showSearch>
              {CASE_TYPES.map((t) => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="totalAmount" label="涉案总金额（万元）" style={{ marginBottom: 12 }}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
          </Form.Item>
          <Form.Item name="victimCount" label="受害人数" style={{ marginBottom: 12 }}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
          </Form.Item>
          <Form.Item name="receiveDate" label="受案日期" style={{ marginBottom: 12 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="filingDate" label="立案日期" style={{ marginBottom: 12 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="noFilingDate" label="不予立案日期" style={{ marginBottom: 12 }}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="leadOfficer" label="主办民警" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
            <Input placeholder="主办民警姓名" />
          </Form.Item>
          <Form.Item name="assistOfficer" label="协办民警" style={{ marginBottom: 12 }}>
            <Input placeholder="协办民警姓名" />
          </Form.Item>
          <Form.Item name="transferRecord" label="案件移交记录" style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
            <Select placeholder="选择移交类型">
              <Select.Option value="中队移交">中队移交</Select.Option>
              <Select.Option value="外单位移交">外单位移交</Select.Option>
              <Select.Option value="退回法制室">退回法制室</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="transferUnit" label="移交单位" style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
            <Input placeholder="移交单位名称" />
          </Form.Item>
          <Form.Item name="briefCase" label="简要案情" style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
            <Input.TextArea rows={4} placeholder="请输入简要案情说明" />
          </Form.Item>
        </Form>
        </div>
      </Modal>
    </div>
  );
}
