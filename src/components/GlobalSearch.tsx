/**
 * 全局搜索组件
 * 搜遍所有模块的所有字段，结果按模块分组展示
 */
import { useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight, FileText } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getMassRecords } from '../store/massStore';
import type { MassRecord } from '../store/massStore';

interface SearchResult {
  moduleId: string;
  moduleLabel: string;
  moduleDept: string;
  records: Array<{
    record: MassRecord;
    matchFields: Array<{ label: string; value: string }>;
  }>;
}

const MODULE_LABEL_MAP: Record<string, { label: string; dept: string }> = {
  'office-finance-assets': { label: '经费保障', dept: '大队办公室' },
  'office-party-attendance': { label: '党建与考勤', dept: '大队办公室' },
  'office-doc-report': { label: '文件与报表', dept: '大队办公室' },
  'office-cluster': { label: '集群协查', dept: '大队办公室' },
  'office-other': { label: '其他事项', dept: '大队办公室' },
  'mass-clue': { label: '涉众线索', dept: '涉众办' },
  'mass-statistics': { label: '涉众统计', dept: '涉众办' },
  'mass-petition': { label: '信访反馈', dept: '涉众办' },
  'mass-interview': { label: '约谈管理', dept: '涉众办' },
  'mass-publicity': { label: '宣传工作', dept: '涉众办' },
  'legal-report-case': { label: '接报案', dept: '法制室' },
  'legal-case-ledger': { label: '案件台账', dept: '法制室' },
  'legal-special-action': { label: '专项行动', dept: '法制室' },
  'legal-assessment': { label: '考核管理', dept: '法制室' },
  'squad-case': { label: '中队案件', dept: '案件中队' },
  'squad-daily': { label: '中队日报', dept: '案件中队' },
  'squad-coercive': { label: '强制措施', dept: '案件中队' },
  'squad-property': { label: '涉案财物', dept: '案件中队' },
  'evidence-clue': { label: '线索登记', dept: '调证分析' },
  'evidence-request': { label: '调证登记', dept: '调证分析' },
  'evidence-freeze': { label: '资金查控', dept: '调证分析' },
  'evidence-phone-collection': { label: '手机采集', dept: '调证分析' },
  'evidence-report': { label: '资金分析', dept: '调证分析' },
};

/** 优先展示的字段（匹配到这些字段时排前面） */
const PRIORITY_FIELDS = new Set(['caseName', 'caseNo', 'holder', 'suspect', 'person', 'reportMatter', 'projectName', 'clueName', 'enterprise']);

/** 字段标签映射 */
const FIELD_LABELS: Record<string, string> = {
  caseName: '案件名称', caseNo: '案件编号',
  holder: '持有人', holderIdentity: '持有人身份',
  idNo: '身份证号码', phone: '手机号', phoneModel: '手机型号',
  collectContent: '采集内容', squad: '所属中队',
  suspect: '嫌疑人', suspectName: '嫌疑人姓名',
  person: '涉案个人', enterprise: '涉案企业',
  reportMatter: '接报事项', projectName: '项目名称',
  clueName: '线索名称', leadOfficer: '主办民警',
};

/**
 * 扁平化一条记录的所有文本字段，过滤出匹配关键词的字段
 */
function matchRecord(record: MassRecord, keyword: string): Array<{ label: string; value: string }> {
  const lowerKw = keyword.toLowerCase();
  const matches: Array<{ label: string; value: string }> = [];

  for (const [key, raw] of Object.entries(record.data || {})) {
    if (raw === null || raw === undefined) continue;
    const str = String(raw);
    if (str.toLowerCase().includes(lowerKw)) {
      const label = FIELD_LABELS[key] || key;
      // 截断过长值
      const display = str.length > 60 ? str.slice(0, 60) + '…' : str;
      matches.push({ label, value: display });
    }
  }

  // 优先级排序：优先字段在前
  matches.sort((a, b) => {
    const aP = PRIORITY_FIELDS.has(a.label) ? 0 : 1;
    const bP = PRIORITY_FIELDS.has(b.label) ? 0 : 1;
    return aP - bP;
  });

  return matches;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const openModal = useAppStore((s) => s.openModal);
  const setEditRecord = useAppStore((s) => s.setEditRecord);
  const darkMode = useAppStore((s) => s.darkMode);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim();
    if (!q) return [];

    const allRecords = getMassRecords();
    const grouped = new Map<string, SearchResult>();

    for (const record of allRecords) {
      const matches = matchRecord(record, q);
      if (matches.length === 0) continue;

      const info = MODULE_LABEL_MAP[record.moduleId] || { label: record.moduleId, dept: '' };
      if (!grouped.has(record.moduleId)) {
        grouped.set(record.moduleId, {
          moduleId: record.moduleId,
          moduleLabel: info.label,
          moduleDept: info.dept,
          records: [],
        });
      }
      grouped.get(record.moduleId)!.records.push({ record, matchFields: matches });
    }

    // 按匹配数量降序排列模块
    return Array.from(grouped.values()).sort((a, b) => b.records.length - a.records.length);
  }, [query]);

  const totalMatches = useMemo(() => results.reduce((s, g) => s + g.records.length, 0), [results]);

  const handleNavigate = useCallback((moduleId: string, record: MassRecord) => {
    setEditRecord(record);
    setCurrentPage(moduleId);
    openModal('newRecord');
    setQuery('');
    setFocused(false);
  }, [setCurrentPage, setEditRecord, openModal]);

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const isOpen = focused && query.trim().length > 0;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 搜索输入框 */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          borderRadius: 14,
          background: darkMode ? 'rgba(28, 31, 38, 0.85)' : '#fff',
          border: focused
            ? `2px solid ${darkMode ? '#4B9EFF' : '#2563EB'}`
            : `2px solid ${darkMode ? 'rgba(163, 201, 255, 0.15)' : '#E5E7EB'}`,
          boxShadow: focused
            ? darkMode
              ? '0 8px 24px rgba(0, 100, 200, 0.25), 0 2px 8px rgba(0,0,0,0.2)'
              : '0 8px 24px rgba(37, 99, 235, 0.15), 0 2px 4px rgba(0,0,0,0.04)'
            : '0 2px 8px rgba(0,0,0,0.04)',
          transition: 'all 0.2s',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '14px 18px',
        }}>
          <Search size={20} color={focused ? (darkMode ? '#4B9EFF' : '#2563EB') : '#9CA3AF'} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 250)}
            placeholder="全局搜索所有模块的全部数据..."
            style={{
              flex: 1, marginLeft: 12,
              border: 'none', outline: 'none',
              fontSize: 16, fontWeight: 500,
              background: 'transparent',
              color: darkMode ? '#e2e2e6' : '#1F2937',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleClear}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                background: darkMode ? 'rgba(66,71,79,0.4)' : '#F3F4F6',
                color: darkMode ? '#8c919a' : '#6B7280',
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </motion.div>
          )}
          {focused && query && (
            <span style={{
              marginLeft: 10, fontSize: 12, color: '#9CA3AF',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              共 {totalMatches} 条匹配
            </span>
          )}
        </div>
      </motion.div>

      {/* 搜索结果下拉 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.97, transformOrigin: 'top' }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
              background: darkMode ? '#1a1d25' : '#fff',
              borderRadius: 14,
              border: darkMode ? '1px solid rgba(163, 201, 255, 0.12)' : '1px solid #E5E7EB',
              boxShadow: darkMode
                ? '0 12px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)'
                : '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)',
              maxHeight: '60vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ overflow: 'auto', flex: 1 }}>
              {results.length === 0 ? (
                <div style={{
                  padding: '24px 20px', textAlign: 'center',
                  color: darkMode ? '#8c919a' : '#9CA3AF', fontSize: 13,
                }}>
                  未找到匹配 "{query}" 的记录
                </div>
              ) : (
                results.map((group) => (
                  <div key={group.moduleId}>
                    {/* 模块分组标题 */}
                    <div style={{
                      padding: '10px 18px 6px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      borderBottom: darkMode ? '1px solid rgba(66,71,79,0.3)' : '1px solid #F3F4F6',
                    }}>
                      <FileText size={13} color={darkMode ? '#4B9EFF' : '#2563EB'} />
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: darkMode ? '#e2e2e6' : '#374151',
                      }}>
                        {group.moduleDept ? `${group.moduleDept} · ` : ''}{group.moduleLabel}
                      </span>
                      <span style={{
                        fontSize: 11,
                        color: darkMode ? '#8c919a' : '#9CA3AF',
                        marginLeft: 'auto',
                      }}>
                        {group.records.length} 条
                      </span>
                    </div>

                    {/* 该模块下的匹配记录 */}
                    {group.records.map((item, ri) => (
                      <motion.div
                        key={item.record.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: ri * 0.02 }}
                        onClick={() => handleNavigate(group.moduleId, item.record)}
                        style={{
                          padding: '9px 18px',
                          cursor: 'pointer',
                          borderBottom: ri < group.records.length - 1
                            ? (darkMode ? '1px solid rgba(66,71,79,0.15)' : '1px solid #F9FAFB')
                            : 'none',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? 'rgba(46,125,202,0.08)' : 'rgba(37,99,235,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 4, height: 4, borderRadius: '50%',
                            background: darkMode ? '#4B9EFF' : '#2563EB',
                            flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* 匹配字段列表 */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px' }}>
                              {item.matchFields.slice(0, 3).map((mf, fi) => (
                                <span key={fi} style={{ fontSize: 12, color: darkMode ? '#c8ccd4' : '#4B5563', lineHeight: 1.6 }}>
                                  <span style={{ color: darkMode ? '#8c919a' : '#9CA3AF' }}>{mf.label}: </span>
                                  <span style={{
                                    color: darkMode ? '#4B9EFF' : '#2563EB',
                                    fontWeight: 500,
                                  }}>
                                    {mf.value}
                                  </span>
                                </span>
                              ))}
                              {item.matchFields.length > 3 && (
                                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                                  +{item.matchFields.length - 3} 项
                                </span>
                              )}
                            </div>
                            {/* 时间 */}
                            <div style={{ fontSize: 10, color: darkMode ? '#8c919a' : '#D1D5DB', marginTop: 2 }}>
                              {item.record.createdAt?.slice(0, 10) || ''}
                            </div>
                          </div>
                          <ChevronRight size={13} color={darkMode ? '#42474f' : '#D1D5DB'} style={{ flexShrink: 0 }} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* 底部提示 */}
            <div style={{
              padding: '8px 18px',
              borderTop: darkMode ? '1px solid rgba(66,71,79,0.3)' : '1px solid #F3F4F6',
              fontSize: 11, color: darkMode ? '#8c919a' : '#9CA3AF',
              textAlign: 'center',
              background: darkMode ? 'rgba(28,31,38,0.6)' : '#FAFBFC',
            }}>
              共搜索 {getMassRecords().length} 条记录 · 点击结果自动打开编辑
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
