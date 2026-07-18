import os, re, json, shutil

ROOT = r"E:\Deployment\WorkBuddy\jingzong-react-office-0616"
TMP = os.path.join(ROOT, ".import_tmp")
LAWS_DIR = os.path.join(ROOT, "public", "laws")
MANIFEST = os.path.join(LAWS_DIR, "manifest.json")

report = json.load(open(os.path.join(TMP, "_report.json"), encoding="utf-8"))
rep_by_base = {r["out"]: r for r in report if "error" not in r}

# ---- 分类中文名 ----
CAT_NAME = {
    "根本法": "宪法·根本法", "刑事": "刑事法律", "司法解释": "司法解释", "经侦管辖": "经侦管辖",
    "公安专项": "公安专项法律", "行政治安": "治安管理处罚法", "行政法律": "行政法律",
    "国家赔偿": "国家赔偿", "监察": "监察法", "指导性文件": "指导性文件",
    "民商法律": "民商法律", "经济法规": "经济法规", "劳动社保": "劳动·社保", "其他法律": "其他法律",
}

SKIP = {
    "最高人民法院、最高人民检察院关于办理掩饰、隐瞒犯罪所得、犯罪所得收益刑事案件适用法律若干问题的解释_20250824",
    "最高人民法院、最高人民检察院关于办理洗钱刑事案件适用法律若干问题的解释_20240819",
    "最高人民法院关于审理非法集资刑事案件具体应用法律若干问题的解释_20220223",
    "最高人民法院关于适用《中华人民共和国刑事诉讼法》的解释_20210126",
    "最高人民法院关于审理骗购外汇、非法买卖外汇刑事案件具体应用法律若干问题的解释_19980828 (1)",
}

# basename(无.txt) -> meta
META = {
    # 司法解释
    "《关于办理内幕交易、泄露内幕信息刑事案件具体应用法律若干问题的解释》的理解与适用": dict(
        title="关于办理内幕交易、泄露内幕信息刑事案件具体应用法律若干问题的解释的理解与适用",
        category="司法解释", source="最高人民法院（官方发布，理解与适用参考）",
        version="《关于办理内幕交易、泄露内幕信息刑事案件具体应用法律若干问题的解释》的理解与适用（参考性解读，非司法解释正文）",
        date="", timeline_label="最高人民法院理解与适用（参考）"),
    "关于办理侵犯公民个人信息刑事案件适用法律若干问题的解释": dict(
        title="最高人民法院、最高人民检察院关于办理侵犯公民个人信息刑事案件适用法律若干问题的解释",
        category="司法解释", source="最高人民法院、最高人民检察院（官方发布）",
        version="法释〔2017〕10号，2017年6月1日起施行，现行有效",
        date="2017-06-01", timeline_label="公布并施行（法释〔2017〕10号）"),
    "关于办理侵犯知识产权刑事案件具体应用法律若干问题的解释": dict(
        title="最高人民法院、最高人民检察院关于办理侵犯知识产权刑事案件具体应用法律若干问题的解释",
        category="司法解释", source="最高人民法院、最高人民检察院（官方发布）",
        version="法释〔2004〕19号（侵犯知识产权刑事案件解释（一）），现行有效",
        date="2004-12-22", timeline_label="公布（法释〔2004〕19号，侵犯知识产权解释（一））"),
    "关于办理妨害信用卡管理刑事案件具体应用法律若干问题的解释": dict(
        title="最高人民法院、最高人民检察院关于办理妨害信用卡管理刑事案件具体应用法律若干问题的解释",
        category="司法解释", source="最高人民法院、最高人民检察院（官方发布）",
        version="法释〔2009〕?号（2018年修正），现行有效（法释号以官方原文为准）",
        date="", timeline_label="公布并施行（妨害信用卡管理刑事案件解释）"),
    "操纵证券、期货市场刑事案件解释": dict(
        title="最高人民法院、最高人民检察院关于办理操纵证券、期货市场刑事案件适用法律若干问题的解释",
        category="司法解释", source="最高人民法院、最高人民检察院（官方发布）",
        version="法释〔2019〕9号，2019年7月1日起施行，现行有效",
        date="2019-07-01", timeline_label="公布并施行（法释〔2019〕9号）"),
    "最高人民法院 最高人民检察院 公安部 关于办理组织领导传销活动刑事案件 适用法律若干问题意见": dict(
        title="最高人民法院、最高人民检察院、公安部关于办理组织领导传销活动刑事案件适用法律若干问题的意见",
        category="司法解释", source="最高人民法院、最高人民检察院、公安部（官方发布）",
        version="公通字〔2013〕37号，2013年11月14日印发，现行有效",
        date="2013-11-14", timeline_label="印发（公通字〔2013〕37号）"),
    "最高人民法院 最高人民检察院关于办理利用未公开信息交易刑事案件适用法律若干问题的解释": dict(
        title="最高人民法院、最高人民检察院关于办理利用未公开信息交易刑事案件适用法律若干问题的解释",
        category="司法解释", source="最高人民法院、最高人民检察院（官方发布）",
        version="法释〔2019〕?号，现行有效（法释号以官方原文为准）",
        date="", timeline_label="公布并施行（利用未公开信息交易刑事案件解释）"),
    "最高人民法院、最高人民检察院关于办理侵犯知识产权刑事案件适用法律若干问题的解释": dict(
        title="最高人民法院、最高人民检察院关于办理侵犯知识产权刑事案件适用法律若干问题的解释",
        category="司法解释", source="最高人民法院、最高人民检察院（官方发布）",
        version="最新整合解释（合并原（一）（二）（三）），现行有效（法释号以官方原文为准）",
        date="", timeline_label="公布（侵犯知识产权刑事案件整合解释）"),
    "最高人民法院、最高人民检察院关于办理袭警刑事案件适用法律若干问题的解释_20250115": dict(
        title="最高人民法院、最高人民检察院关于办理袭警刑事案件适用法律若干问题的解释",
        category="司法解释", source="最高人民法院、最高人民检察院（官方发布）",
        version="法释〔2025〕?号，2025年1月15日公布，现行有效（法释号以官方原文为准）",
        date="2025-01-15", timeline_label="公布（袭警刑事案件解释）"),
    "最高人民法院、最高人民检察院关于执行《中华人民共和国刑法》+确定罪名的补充规定（七）_20210226": dict(
        title="最高人民法院、最高人民检察院关于执行《中华人民共和国刑法》确定罪名的补充规定（七）",
        category="刑事", source="最高人民法院、最高人民检察院（官方发布）",
        version="法释〔2021〕?号，2021年2月26日通过，现行有效（法释号以官方原文为准）",
        date="2021-02-26", timeline_label="通过（罪名补充规定（七））"),
    "最高人民法院、最高人民检察院关于执行《中华人民共和国刑法》确定罪名的补充规定（八）_20240130": dict(
        title="最高人民法院、最高人民检察院关于执行《中华人民共和国刑法》确定罪名的补充规定（八）",
        category="刑事", source="最高人民法院、最高人民检察院（官方发布）",
        version="法释〔2024〕?号，2024年1月30日通过，现行有效（法释号以官方原文为准）",
        date="2024-01-30", timeline_label="通过（罪名补充规定（八））"),
    "最高人民法院关于修改《关于审理掩饰、隐瞒犯罪所得、犯罪所得收益刑事案件适用法律若干问题的解释》的决定_20210413": dict(
        title="最高人民法院关于修改《关于审理掩饰、隐瞒犯罪所得、犯罪所得收益刑事案件适用法律若干问题的解释》的决定",
        category="司法解释", source="最高人民法院（官方发布）",
        version="法释〔2021〕?号，2021年4月13日通过，现行有效（法释号以官方原文为准）",
        date="2021-04-13", timeline_label="通过（修改掩饰、隐瞒犯罪所得解释的决定）"),
    "最高人民法院关于修改《最高人民法院关于审理非法集资刑事案件具体应用法律若干问题的解释》的决定_20220223": dict(
        title="最高人民法院关于修改《关于审理非法集资刑事案件具体应用法律若干问题的解释》的决定",
        category="司法解释", source="最高人民法院（官方发布）",
        version="法释〔2022〕?号，2022年2月23日通过，现行有效（法释号以官方原文为准）",
        date="2022-02-23", timeline_label="通过（修改非法集资解释的决定）"),
    "最高人民法院关于公司解散纠纷案件受理费收费标准的批复_20230922": dict(
        title="最高人民法院关于公司解散纠纷案件受理费收费标准的批复",
        category="司法解释", source="最高人民法院（官方发布）",
        version="法释〔2023〕?号，2023年9月22日公布，现行有效（法释号以官方原文为准）",
        date="2023-09-22", timeline_label="公布（公司解散案件受理费批复）"),
    "最高人民法院关于审理伪造货币等案件具体应用法律若干问题的解释": dict(
        title="最高人民法院关于审理伪造货币等案件具体应用法律若干问题的解释",
        category="司法解释", source="最高人民法院（官方发布）",
        version="法释〔2000〕26号，2000年9月14日起施行，现行有效（与法释〔2010〕14号配套）",
        date="2000-09-14", timeline_label="公布并施行（法释〔2000〕26号，伪造货币解释（一））"),
    "最高人民法院关于审理证券市场虚假陈述侵权民事赔偿案件的若干规定_20220121": dict(
        title="最高人民法院关于审理证券市场虚假陈述侵权民事赔偿案件的若干规定",
        category="司法解释", source="最高人民法院（官方发布）",
        version="法释〔2022〕2号，2022年1月21日起施行，现行有效",
        date="2022-01-21", timeline_label="公布并施行（法释〔2022〕2号）"),
    "最高人民法院关于适用《中华人民共和国民法典》合同编通则若干问题的解释_20231204": dict(
        title="最高人民法院关于适用《中华人民共和国民法典》合同编通则若干问题的解释",
        category="司法解释", source="最高人民法院（官方发布）",
        version="法释〔2023〕13号，2023年12月4日公布，2023年12月5日起施行，现行有效",
        date="2023-12-05", timeline_label="公布并施行（法释〔2023〕13号）"),
    "最高人民法院关于适用《中华人民共和国民法典》婚姻家庭编的解释（二）_20250115": dict(
        title="最高人民法院关于适用《中华人民共和国民法典》婚姻家庭编的解释（二）",
        category="司法解释", source="最高人民法院、最高人民检察院（官方发布）",
        version="法释〔2025〕?号，2025年1月15日公布，现行有效（法释号以官方原文为准）",
        date="2025-01-15", timeline_label="公布（婚姻家庭编解释（二））"),
    "最高人民法院关于审理骗购外汇、非法买卖外汇刑事案件具体应用法律若干问题的解释_19980828": dict(
        title="最高人民法院关于审理骗购外汇、非法买卖外汇刑事案件具体应用法律若干问题的解释",
        category="司法解释", source="最高人民法院（官方发布）",
        version="法释〔1998〕20号，1998年9月1日起施行，现行有效（与《关于惩治骗购外汇、逃汇和非法买卖外汇犯罪的决定》配套）",
        date="1998-09-01", timeline_label="公布并施行（法释〔1998〕20号）"),
    # 民商法律
    "中华人民共和国会计法_20240628": dict(title="中华人民共和国会计法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="1999年修订，2024年6月28日修正，现行有效",
        date="2024-07-01", timeline_label="修正通过（2024-06-28，现行有效）"),
    "中华人民共和国保险法_20150424": dict(title="中华人民共和国保险法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="2009年修订，2015年4月24日修正，现行有效",
        date="2015-04-24", timeline_label="修正（2015-04-24，现行有效）"),
    "中华人民共和国公司法_20231229": dict(title="中华人民共和国公司法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="1993年通过，2023年12月29日修订，2024年7月1日施行，现行有效",
        date="2024-07-01", timeline_label="修订通过（2023-12-29，2024-07-01施行）"),
    "中华人民共和国反不正当竞争法_20250627": dict(title="中华人民共和国反不正当竞争法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="1993年通过，2025年6月27日修订，2026年1月1日施行，现行有效",
        date="2026-01-01", timeline_label="修订通过（2025-06-27，2026-01-01施行）"),
    "中华人民共和国反洗钱法_20241108": dict(title="中华人民共和国反洗钱法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="2006年通过，2024年11月8日修订，2025年1月1日施行，现行有效",
        date="2025-01-01", timeline_label="修订通过（2024-11-08，2025-01-01施行）"),
    "中华人民共和国商业银行法_20150829": dict(title="中华人民共和国商业银行法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="1995年通过，2015年8月29日修正，现行有效",
        date="2015-08-29", timeline_label="修正（2015-08-29，现行有效）"),
    "中华人民共和国商标法_20260626": dict(title="中华人民共和国商标法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="1982年通过，最近修正2026年6月26日，现行有效",
        date="2026-06-26", timeline_label="修正（2026-06-26，现行有效）"),
    "中华人民共和国期货和衍生品法_20220420": dict(title="中华人民共和国期货和衍生品法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="2022年4月20日通过，2022年8月1日施行，现行有效",
        date="2022-08-01", timeline_label="通过（2022-04-20，2022-08-01施行）"),
    "中华人民共和国票据法_20040828": dict(title="中华人民共和国票据法", category="民商法律",
        source="全国人民代表大会（官方发布）", version="1995年通过，2004年8月28日修正，现行有效",
        date="2004-08-28", timeline_label="修正（2004-08-28，现行有效）"),
    "中华人民共和国证券投资基金法_20150424": dict(title="中华人民共和国证券投资基金法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="2003年通过，2015年4月24日修正，现行有效",
        date="2015-04-24", timeline_label="修正（2015-04-24，现行有效）"),
    "中华人民共和国证券法_20191228": dict(title="中华人民共和国证券法", category="民商法律",
        source="全国人民代表大会常务委员会（官方发布）", version="1998年通过，2019年12月28日修订，2020年3月1日施行，现行有效",
        date="2020-03-01", timeline_label="修订通过（2019-12-28，2020-03-01施行）"),
    "中华人民共和国民法典_20200528": dict(title="中华人民共和国民法典", category="民商法律",
        source="全国人民代表大会（官方发布）", version="2020年5月28日通过，2021年1月1日施行，现行有效，共1260条",
        date="2021-01-01", timeline_label="通过（2020-05-28，2021-01-01施行，共1260条）", articles_override=1260),
    # 经济法规
    "中华人民共和国国家发展规划法_20260312": dict(title="中华人民共和国国家发展规划法", category="经济法规",
        source="全国人民代表大会（官方发布）", version="2026年3月12日通过，现行有效",
        date="2026-03-12", timeline_label="通过（2026-03-12）"),
    "中华人民共和国增值税法实施条例_20251225": dict(title="中华人民共和国增值税法实施条例", category="经济法规",
        source="国务院（官方发布）", version="2025年12月25日公布，现行有效",
        date="2025-12-25", timeline_label="公布（2025-12-25）"),
    "中华人民共和国外汇管理条例_20080805": dict(title="中华人民共和国外汇管理条例", category="经济法规",
        source="国务院（官方发布）", version="1996年发布，2008年8月5日修订，现行有效",
        date="2008-08-05", timeline_label="修订（2008-08-05，现行有效）"),
    "中华人民共和国招标投标法_20171227": dict(title="中华人民共和国招标投标法", category="经济法规",
        source="全国人民代表大会常务委员会（官方发布）", version="1999年通过，2017年12月27日修正，现行有效",
        date="2017-12-27", timeline_label="修正（2017-12-27，现行有效）"),
    "中华人民共和国招标投标法实施条例_20190302": dict(title="中华人民共和国招标投标法实施条例", category="经济法规",
        source="国务院（官方发布）", version="2011年通过，2019年3月2日修订，现行有效",
        date="2019-03-02", timeline_label="修订（2019-03-02，现行有效）"),
    "中华人民共和国税收征收管理法_20150424": dict(title="中华人民共和国税收征收管理法", category="经济法规",
        source="全国人民代表大会常务委员会（官方发布）", version="1992年通过，2015年4月24日修正，现行有效",
        date="2015-04-24", timeline_label="修正（2015-04-24，现行有效）"),
    "期货交易管理条例_20170301": dict(title="期货交易管理条例", category="经济法规",
        source="国务院（官方发布）", version="1999年发布，2017年3月1日修订，现行有效",
        date="2017-03-01", timeline_label="修订（2017-03-01，现行有效）"),
    "全国人民代表大会常务委员会关于惩治骗购外汇、逃汇和非法买卖外汇犯罪的决定_19981229": dict(
        title="全国人民代表大会常务委员会关于惩治骗购外汇、逃汇和非法买卖外汇犯罪的决定", category="刑事",
        source="全国人民代表大会常务委员会（官方发布）", version="1998年12月29日通过，现行有效",
        date="1998-12-29", timeline_label="通过（1998-12-29，现行有效）"),
    # 劳动社保
    "中华人民共和国劳动合同法_20121228": dict(title="中华人民共和国劳动合同法", category="劳动社保",
        source="全国人民代表大会常务委员会（官方发布）", version="2007年通过，2012年12月28日修正，现行有效",
        date="2012-12-28", timeline_label="修正（2012-12-28，现行有效）"),
    "中华人民共和国社会保险法_20181229": dict(title="中华人民共和国社会保险法", category="劳动社保",
        source="全国人民代表大会常务委员会（官方发布）", version="2010年通过，2018年12月29日修正，现行有效",
        date="2018-12-29", timeline_label="修正（2018-12-29，现行有效）"),
    "中华人民共和国社会救助法_20260430": dict(title="中华人民共和国社会救助法", category="劳动社保",
        source="全国人民代表大会常务委员会（官方发布）", version="2026年4月30日通过，现行有效",
        date="2026-04-30", timeline_label="通过（2026-04-30）"),
    # 其他法律
    "中华人民共和国安全生产法_20210610": dict(title="中华人民共和国安全生产法", category="其他法律",
        source="全国人民代表大会常务委员会（官方发布）", version="2002年通过，2021年6月10日修正，现行有效",
        date="2021-06-10", timeline_label="修正（2021-06-10，现行有效）"),
    "中华人民共和国民族团结进步促进法_20260312": dict(title="中华人民共和国民族团结进步促进法", category="其他法律",
        source="全国人民代表大会（官方发布）", version="2026年3月12日通过，现行有效",
        date="2026-03-12", timeline_label="通过（2026-03-12）"),
    "中华人民共和国生态环境法典_20260312": dict(title="中华人民共和国生态环境法典", category="其他法律",
        source="全国人民代表大会（官方发布）", version="2026年3月12日通过，现行有效",
        date="2026-03-12", timeline_label="通过（2026-03-12）"),
    "中华人民共和国监狱法_20260430": dict(title="中华人民共和国监狱法", category="其他法律",
        source="全国人民代表大会常务委员会（官方发布）", version="1994年通过，2026年4月30日修正，现行有效",
        date="2026-04-30", timeline_label="修正（2026-04-30，现行有效）"),
    # 经侦管辖补充
    "经侦管辖的77类案件": dict(title="经侦管辖的77类案件（一览参考）", category="经侦管辖",
        source="用户提供的经侦管辖案件一览（与规定（二）互补参考）",
        version="经侦管辖刑事案件一览（按01-77编号，与规定（二）互补参考）",
        date="", timeline_label="用户提供的经侦管辖案件一览（参考）"),
}

# ---- 加载现有 manifest ----
manifest = json.load(open(MANIFEST, encoding="utf-8"))
existing_ids = {l["id"] for l in manifest["laws"]}
new_entries = []
warned = []

for base, meta in META.items():
    src = os.path.join(TMP, base + ".txt")
    if not os.path.exists(src):
        warned.append(f"缺失源文件: {base}")
        continue
    cat = meta["category"]
    title = meta["title"]
    law_id = f"{cat}/{title}"
    if law_id in existing_ids:
        warned.append(f"已存在跳过: {law_id}")
        continue
    # 复制文本
    cat_dir = os.path.join(LAWS_DIR, cat)
    os.makedirs(cat_dir, exist_ok=True)
    dst = os.path.join(cat_dir, title + ".txt")
    shutil.copyfile(src, dst)
    # 条数
    rep = rep_by_base.get(base, {})
    articles = meta.get("articles_override") or rep.get("article_lines", 0) or 0
    date = meta.get("date", "")
    entry = {
        "id": law_id,
        "title": title,
        "category": cat,
        "categoryName": CAT_NAME[cat],
        "file": f"{cat}/{title}.txt",
        "source": meta["source"],
        "sourceUrl": "",
        "version": meta["version"],
        "effectiveDate": date,
        "articles": articles,
        "timeline": [{"date": date, "label": meta["timeline_label"]}],
    }
    new_entries.append(entry)

# 检查未处理文件
handled = set(META.keys()) | SKIP
for base in rep_by_base:
    b4 = base[:-4] if base.endswith(".txt") else base
    if b4 not in handled:
        warned.append(f"未归类（请检查）: {base}")

manifest["laws"].extend(new_entries)
# 重算 categories
from collections import defaultdict, OrderedDict
cat_count = defaultdict(int)
for l in manifest["laws"]:
    cat_count[l["category"]] += 1
new_categories = []
seen = OrderedDict()
for l in manifest["laws"]:
    seen.setdefault(l["category"], CAT_NAME.get(l["category"], l["category"]))
for cid, cname in seen.items():
    new_categories.append({"id": cid, "name": cname, "count": cat_count[cid]})
manifest["categories"] = new_categories
manifest["totalLaws"] = len(manifest["laws"])

json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("新增条目:", len(new_entries))
print("totalLaws:", manifest["totalLaws"], "laws.length:", len(manifest["laws"]), "catSum:", sum(c["count"] for c in new_categories))
print("分类数:", len(new_categories))
for c in new_categories:
    print(f"  {c['id']}: {c['count']}")
print("警告:", warned)
