import { useEffect, useMemo, useState } from 'react';
import { Scale, Search, BookOpen, ChevronLeft, ExternalLink, Layers, Hash, ScrollText, CalendarClock } from 'lucide-react';
import { Input } from 'antd';
import { useAppStore } from '../store/appStore';
import { BRAND } from '../constants/theme';

interface LawMeta {
  id: string;
  title: string;
  category: string;
  categoryName: string;
  file: string;
  source: string;
  sourceUrl: string;
  version: string;
  effectiveDate: string;
  articles: number;
}
interface Manifest {
  generatedAt: string;
  totalLaws: number;
  categories: { id: string; name: string; count: number }[];
  laws: LawMeta[];
}

interface ArticleBlock { kind: 'article'; num: string; body: string[]; }
interface SectionBlock { kind: 'section'; title: string; }
interface IntroBlock { kind: 'intro'; text: string; }
type Block = ArticleBlock | SectionBlock | IntroBlock;

const base = import.meta.env.BASE_URL || '/';
const assetUrl = (file: string) => base + file.replace(/^\//, '');

const ART_RE = /^第([一二三四五六七八九十百零〇两]+)条(之一)?[　 \t]*(.*)$/;
const SECTION_RE = /^第([一二三四五六七八九十百零〇两]+)(编|章)[　 \t]*(.*)$/;

function parseLaw(md: string): { title: string; meta: string[]; blocks: Block[] } {
  const lines = md.split('\n');
  let title = '';
  const meta: string[] = [];
  const introLines: string[] = [];
  const blocks: Block[] = [];
  let curArt: { num: string; body: string[] } | null = null;

  const pushArt = () => {
    if (curArt) {
      blocks.push({ kind: 'article', num: curArt.num, body: curArt.body });
      curArt = null;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!title && /^#\s+/.test(line)) { title = line.replace(/^#\s+/, ''); continue; }
    if (line.startsWith('> ')) { meta.push(line.slice(2)); continue; }
    const am = line.match(ART_RE);
    if (am) {
      pushArt();
      const num = '第' + am[1] + '条' + (am[2] || '');
      const rest = am[3] || '';
      curArt = { num, body: rest ? [rest] : [] };
      continue;
    }
    const sm = line.match(SECTION_RE);
    if (sm) {
      pushArt();
      blocks.push({ kind: 'section', title: '第' + sm[1] + (sm[2] as string) + (sm[3] ? '　' + sm[3] : '') });
      continue;
    }
    if (line.trim() === '') continue;
    if (curArt) curArt.body.push(line.trim());
    else introLines.push(line.trim());
  }
  pushArt();
  if (introLines.length) blocks.unshift({ kind: 'intro', text: introLines.join('\n') });
  return { title, meta, blocks };
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#FDE68A', color: '#7C2D12', borderRadius: 3, padding: '0 2px' }}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function LegalKnowledge() {
  const showToast = useAppStore((s) => s.showToast);
  const darkMode = useAppStore((s) => s.darkMode);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState<string>('全部');
  const [kw, setKw] = useState('');

  const [selected, setSelected] = useState<LawMeta | null>(null);
  const [lawText, setLawText] = useState<string>('');
  const [lawLoading, setLawLoading] = useState(false);
  const [articleQ, setArticleQ] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(assetUrl('laws/manifest.json'))
      .then((r) => { if (!r.ok) throw new Error('清单读取失败 ' + r.status); return r.json(); })
      .then((data: Manifest) => { if (alive) setManifest(data); })
      .catch((e) => showToast('法规清单加载失败: ' + (e instanceof Error ? e.message : '未知错误'), 'error'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [showToast]);

  const totalArticles = useMemo(
    () => (manifest ? manifest.laws.reduce((s, l) => s + (l.articles || 0), 0) : 0),
    [manifest]
  );
  const judicialCount = useMemo(
    () => (manifest ? manifest.laws.filter((l) => l.category === '司法解释').length : 0),
    [manifest]
  );

  const filteredLaws = useMemo(() => {
    if (!manifest) return [];
    const k = kw.trim().toLowerCase();
    return manifest.laws.filter((l) => {
      if (catFilter !== '全部' && l.category !== catFilter) return false;
      if (!k) return true;
      return l.title.toLowerCase().includes(k) || (l.source || '').toLowerCase().includes(k);
    });
  }, [manifest, catFilter, kw]);

  const openLaw = (law: LawMeta) => {
    setSelected(law);
    setArticleQ('');
    setLawLoading(true);
    setLawText('');
    fetch(assetUrl('laws/' + law.file + '.md'))
      .then((r) => { if (!r.ok) throw new Error('法条读取失败 ' + r.status); return r.text(); })
      .then((t) => setLawText(t))
      .catch((e) => showToast('法条加载失败: ' + (e instanceof Error ? e.message : '未知错误'), 'error'))
      .finally(() => setLawLoading(false));
    // 返回列表时清空选择
    window.scrollTo({ top: 0 });
  };

  const parsed = useMemo(() => (lawText ? parseLaw(lawText) : null), [lawText]);
  const articleBlocks = useMemo(
    () => (parsed ? parsed.blocks.filter((b): b is ArticleBlock => b.kind === 'article') : []),
    [parsed]
  );
  const shownArticles = useMemo(() => {
    const q = articleQ.trim();
    if (!q) return articleBlocks;
    return articleBlocks.filter((a) => (a.num + ' ' + a.body.join(' ')).includes(q));
  }, [articleBlocks, articleQ]);

  const Kpi = ({ label, val, ico, grad, unit }: { label: string; val: number; ico: React.ReactNode; grad: string; unit?: string }) => (
    <div className="wb-kpi" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span className="wb-kpi-ico" style={{ background: grad, color: '#fff' }}>{ico}</span>
      <div>
        <div className="wb-kpi-label">{label}</div>
        <div className="wb-kpi-val">{val}{unit && <span className="wb-kpi-unit">{unit}</span>}</div>
      </div>
    </div>
  );

  const panelBg = darkMode ? '#0e1626' : '#fff';
  const panelBorder = darkMode ? 'rgba(163,201,255,0.1)' : '#EAEFF5';
  const textColor = darkMode ? '#E6EAF2' : '#1F2937';
  const textMuted = darkMode ? '#8A94A6' : '#6B7280';

  // ── 法条详情视图 ──
  if (selected && parsed) {
    return (
      <div style={{ padding: '24px 28px 40px', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <button className="dash-action" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>
          <ChevronLeft size={15} /> 返回法规库
        </button>

        <div className="dash-hero" style={{ marginBottom: 16 }}>
          <span className="dash-hero-avatar" style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${BRAND.primaryDark},${BRAND.primaryLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(37,99,235,.3)' }}>
            <Scale size={26} />
          </span>
          <div>
            <div className="dash-hero-greet">{parsed.title}</div>
            <div className="dash-hero-sub">{selected.categoryName} · 共 {selected.articles} 条</div>
          </div>
        </div>

        {/* 来源信息 */}
        <div className="wb-panel" style={{ padding: 16, marginBottom: 16, background: panelBg, border: `1px solid ${panelBorder}` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', fontSize: 13, color: textMuted }}>
            {selected.source && <span><b style={{ color: textColor }}>来源：</b>{selected.source}</span>}
            {selected.version && <span><b style={{ color: textColor }}>版本：</b>{selected.version}</span>}
            {selected.effectiveDate && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CalendarClock size={13} /> 施行：{selected.effectiveDate}</span>}
          </div>
          {selected.sourceUrl && (
            <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="dash-action" style={{ marginTop: 12, display: 'inline-flex', width: 'auto' }}>
              <ExternalLink size={14} /> 查看官方原文
            </a>
          )}
        </div>

        {/* 法条内搜索 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <Input
            allowClear
            prefix={<Search size={15} />}
            placeholder="搜索本法的法条内容（如：行贿、拘留、监视居住）"
            value={articleQ}
            onChange={(e) => setArticleQ(e.target.value)}
            style={{ maxWidth: 460 }}
          />
          <span style={{ fontSize: 13, color: textMuted }}>
            {articleQ.trim() ? `命中 ${shownArticles.length} 条` : `全部 ${articleBlocks.length} 条`}
          </span>
        </div>

        {lawLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: textMuted }}>正在加载法条…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shownArticles.length === 0 && (
              <div style={{ padding: 50, textAlign: 'center', color: textMuted }}>未找到匹配的法条</div>
            )}
            {parsed.blocks.map((b, i) => {
              if (b.kind === 'intro') {
                return (
                  <div key={'intro' + i} style={{ padding: '4px 2px', color: textMuted, fontSize: 14, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                    {b.text}
                  </div>
                );
              }
              if (b.kind === 'section') {
                return (
                  <div key={'sec' + i} style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${panelBorder}`, fontSize: 16, fontWeight: 800, color: BRAND.primaryDark, letterSpacing: '0.02em' }}>
                    {b.title}
                  </div>
                );
              }
              // article
              const matchQ = articleQ.trim();
              if (matchQ && !shownArticles.includes(b)) return null;
              return (
                <div key={'art' + i} className="wb-panel" style={{ padding: '12px 16px', background: panelBg, border: `1px solid ${panelBorder}` }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: BRAND.primaryDark, marginBottom: 6 }}>
                    {highlight(b.num, matchQ)}
                  </div>
                  {b.body.map((p, pi) => (
                    <div key={pi} style={{ fontSize: 14.5, lineHeight: 1.95, color: textColor, whiteSpace: 'pre-wrap' }}>
                      {highlight(p, matchQ)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── 法规库列表视图 ──
  return (
    <div style={{ padding: '24px 28px 40px', maxWidth: 1240, margin: '0 auto', width: '100%' }}>
      <div className="dash-hero" style={{ marginBottom: 18 }}>
        <span className="dash-hero-avatar" style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${BRAND.primaryDark},${BRAND.primaryLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(37,99,235,.3)' }}>
          <Scale size={26} />
        </span>
        <div>
          <div className="dash-hero-greet">典法查阅</div>
          <div className="dash-hero-sub">宪法 · 刑事 · 行政 · 公安专项 · 监察 · 两高司法解释，全量官方法条离线检索</div>
        </div>
        <div className="dash-hero-actions" style={{ flex: '0 0 auto', width: 320, maxWidth: '40vw' }}>
          <Input
            allowClear
            prefix={<Search size={15} />}
            placeholder="搜索法律名称 / 来源"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
          />
        </div>
      </div>

      <div className="dash-kpi" style={{ marginBottom: 18 }}>
        <Kpi label="法律法规" val={manifest?.totalLaws ?? 0} ico={<BookOpen size={24} />} grad={`linear-gradient(135deg,${BRAND.primaryDark},${BRAND.primaryLight})`} unit="部" />
        <Kpi label="法律分类" val={manifest?.categories.length ?? 0} ico={<Layers size={24} />} grad="linear-gradient(135deg,#0E7C4B,#38A169)" unit="类" />
        <Kpi label="收录法条" val={totalArticles} ico={<Hash size={24} />} grad="linear-gradient(135deg,#1D4ED8,#3B82F6)" unit="条" />
        <Kpi label="司法解释" val={judicialCount} ico={<ScrollText size={24} />} grad="linear-gradient(135deg,#6D28D9,#8B5CF6)" unit="件" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 18, alignItems: 'start' }}>
        {/* 分类侧栏 */}
        <div className="wb-panel" style={{ padding: 10, background: panelBg, border: `1px solid ${panelBorder}`, position: 'sticky', top: 12 }}>
          <div
            onClick={() => setCatFilter('全部')}
            className="wb-hover-ghost"
            style={{ padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: catFilter === '全部' ? 800 : 500, color: catFilter === '全部' ? BRAND.primary : textColor, background: catFilter === '全部' ? (darkMode ? 'rgba(37,99,235,.18)' : 'rgba(37,99,235,.1)') : 'transparent', fontSize: 14 }}
          >
            全部法规 ({manifest?.totalLaws ?? 0})
          </div>
          {(manifest?.categories ?? []).map((c) => (
            <div
              key={c.id}
              onClick={() => setCatFilter(c.id)}
              className="wb-hover-ghost"
              style={{ padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: catFilter === c.id ? 800 : 500, color: catFilter === c.id ? BRAND.primary : textColor, background: catFilter === c.id ? (darkMode ? 'rgba(37,99,235,.18)' : 'rgba(37,99,235,.1)') : 'transparent', fontSize: 14, display: 'flex', justifyContent: 'space-between' }}
            >
              <span>{c.name}</span>
              <span style={{ color: textMuted }}>{c.count}</span>
            </div>
          ))}
        </div>

        {/* 卡片网格 */}
        <div>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: textMuted }}>正在加载法规库…</div>
          ) : filteredLaws.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: textMuted }}>没有匹配的法律</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
              {filteredLaws.map((l) => (
                <div
                  key={l.id}
                  className="wb-panel"
                  style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer', background: panelBg, border: `1px solid ${panelBorder}` }}
                  onClick={() => openLaw(l)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(37,99,235,.12)', color: BRAND.primaryDark }}>
                      <BookOpen size={20} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: textColor, lineHeight: 1.35 }}>{l.title}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: `${BRAND.primaryDark}1f`, color: BRAND.primaryDark, fontWeight: 600 }}>{l.categoryName}</span>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: 'var(--color-surface-hover)', color: textMuted, border: `1px solid ${panelBorder}` }}>{l.articles} 条</span>
                      </div>
                    </div>
                  </div>
                  {l.version && (
                    <div style={{ fontSize: 12.5, color: textMuted, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {l.version}
                    </div>
                  )}
                  {l.source && (
                    <div style={{ fontSize: 12, color: textMuted, marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ExternalLink size={12} /> {l.source}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
