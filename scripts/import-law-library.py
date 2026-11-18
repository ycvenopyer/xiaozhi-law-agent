"""Rebuild the bundled official articles with Python, requests and beautifulsoup4."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date
import json
from pathlib import Path
import re
import argparse

from bs4 import BeautifulSoup
import requests

ROOT = Path(__file__).resolve().parents[1]
# Stable key, name, version, inclusive start, exclusive end, issuer, tier, selected articles, official text
SOURCES = """
regTrademark|规范商标申请注册行为若干规定|市场监管总局令第17号|2019-12-01||国家市场监督管理总局|部门规章|1 2 3|https://www.cnipa.gov.cn/attach/0/5b14f84d13e84b22965eb1983834d16f.pdf
patAdmin|专利纠纷行政裁决和调解办法|局令第81号|2025-02-01||国家知识产权局|部门规章|1 2 3|https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=f19e85bad6834f3d8e28f96d1cdfe03f.pdf
tmCourt|关于审理商标民事纠纷案件适用法律若干问题的解释|法释〔2002〕32号，2020年修正|2021-01-01||最高人民法院|L3|9 10 11 12|https://www.court.gov.cn/fabu/xiangqing/282671.html
abnormal|规范申请专利行为的规定|局令第77号|2024-01-20||国家知识产权局|部门规章|2 3 4|https://www.cnipa.gov.cn/art/2023/12/21/art_2790_189475.html
evidence|关于知识产权民事诉讼证据的若干规定|法释〔2020〕12号|2020-11-18||最高人民法院|L3|1 2 3 4 5|https://www.court.gov.cn/fabu/xiangqing/272241.html
competition|关于适用《中华人民共和国反不正当竞争法》若干问题的解释|法释〔2022〕9号|2022-03-20||最高人民法院|L3|1 2 4|https://www.court.gov.cn/zixun/xiangqing/351291.html
criminal|关于办理侵犯知识产权刑事案件适用法律若干问题的解释|法释〔2025〕5号|2025-04-26||最高人民法院、最高人民检察院|L3|1 2 3|https://ipc.court.gov.cn/zh-cn/news/view-4225.html
copyrightInterp|关于审理著作权民事纠纷案件适用法律若干问题的解释|法释〔2002〕31号，2026年修正|2026-09-01||最高人民法院|L3|7 8 9|https://ipc.court.gov.cn/zh-cn/news/view-6242.html
patentDispute|关于审理专利纠纷案件适用法律问题的若干规定|法释〔2001〕21号，2020年修正|2021-01-01||最高人民法院|L3|1 14 15|https://ipc.court.gov.cn/zh-cn/news/view-6237.html
patent2|关于审理侵犯专利权纠纷案件应用法律若干问题的解释（二）|法释〔2016〕1号，2020年修正|2021-01-01||最高人民法院|L3|1 2 22|https://ipc.court.gov.cn/zh-cn/news/view-6238.html
patent1|关于审理侵犯专利权纠纷案件应用法律若干问题的解释|法释〔2009〕21号|2010-01-01||最高人民法院|L3|2 3 7|https://ipc.court.gov.cn/zh-cn/news/view-6239.html
customs|知识产权海关保护条例|2018年修订|2018-03-19||国务院|L2|2 3 7|https://xzfg.moj.gov.cn/front/law/detail?LawID=52
net2013|信息网络传播权保护条例|2013年修订|2013-03-01||国务院|L2|2 6 14 15|https://xzfg.moj.gov.cn/front/law/detail?LawID=167
priority|专利优先审查管理办法|局令第85号|2026-09-01||国家知识产权局|部门规章|1 2 4|https://www.cnipa.gov.cn/art/2026/7/30/art_74_207457.html
agency|专利代理管理办法|市场监管总局令第6号|2019-05-01||国家市场监督管理总局|部门规章|1 2 4|https://www.cnipa.gov.cn/art/2019/5/5/art_99_28205.html
tm19|商标法|2019年修正|2019-11-01|2027-01-01|全国人大常委会|L1|3 13 32 48 57 59 60 61 62 63 64|https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html
tm26|商标法|2026年修订|2027-01-01||全国人大常委会|L1|2 72 73 74 77 81|https://www.cnipa.gov.cn/art/2026/6/26/art_3686_206940.html
pat|专利法|2020年修正|2021-06-01||全国人大常委会|L1|6 10 11 16 19 22 23 26 39 42 64 65 66 67 70 71 72|https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html
cr|著作权法|2020年修正|2021-06-01||全国人大常委会|L1|2 3 5 9 10 11 12 18 19 24 25 26 27 37 40 44 50 52 53 54 55 56 65|https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html
uc|反不正当竞争法|2025年修订|2025-10-15||全国人大常委会|L1|2 7 9 10 11 12 13 22 26|https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html
pat-reg|专利法实施细则|2023年修订|2024-01-20||国务院|L2|11 12 13 14 92 93|https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html
damages|关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释|法释〔2026〕7号|2026-05-01||最高人民法院|L3|1 2 3 4 5 6|https://www.court.gov.cn/zixun/xiangqing/497911.html
software|计算机软件保护条例|2013年修订|2013-03-01||国务院|L2|6 8 13 14 16 17 24|https://ipc.court.gov.cn/zh-cn/news/view-6245.html
cr-reg|著作权法实施条例|2013年修订|2013-03-01||国务院|L2|2 3 6 21|https://www.gov.cn/zhengce/2013-02/08/content_2602616.htm
tm-reg|商标法实施条例|2014年修订|2014-05-01||国务院|L2|75 76 77|https://www.cnipa.gov.cn/art/2015/9/14/art_96_28188.html
labor|劳动合同法|2012年修正|2013-07-01||全国人大常委会|L1|23 24 90|https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_0abfdd261c03417b949df19d869add8d.html
""".strip().splitlines()

def numeral(n):
    d = '零一二三四五六七八九'
    if n < 10:
        return d[n]
    return (d[n // 10] if n >= 20 else '') + '十' + (d[n % 10] if n % 10 else '')

def read_page(url):
    response = requests.get(url, timeout=25)
    response.raise_for_status()
    if response.content.startswith(b'%PDF'):
        import fitz
        with fitz.open(stream=response.content, filetype='pdf') as pdf:
            return '\n'.join(page.get_text() for page in pdf)
    soup = BeautifulSoup(response.content, 'html.parser', from_encoding=response.apparent_encoding)
    for tag in soup(['script', 'style']):
        tag.decompose()
    for tag in soup.find_all(['p', 'div', 'br', 'h2', 'h3']):
        tag.append('\n')
        tag.insert_before('\n')
    return soup.get_text()

def collect(line, texts):
    key, title, version, start, end, authority, tier, numbers, url = line.split('|')
    snapshot = texts / (key + '.txt') if texts else None
    text = snapshot.read_text(encoding='utf-8') if snapshot and snapshot.exists() else read_page(url)
    body = '\n'.join(line.strip() for line in text.splitlines() if line.strip())
    # This court URL consolidates 18 judicial interpretations numbered separately.
    if key == 'tmCourt':
        section_start = re.search(r'(?m)^第九条\s*商标法第五十七条', body)
        section_end = re.search(r'(?m)^第十三条', body[section_start.end():]) if section_start else None
        if not section_start or not section_end:
            raise ValueError('trademark interpretation section missing')
        body = body[section_start.start():section_start.end()+section_end.end()]
    markers = list(re.finditer(r'(?m)^第([零〇一二三四五六七八九十百]+)条[ \u3000\xa0]*', body))
    indexed = {}
    for m, following in zip(markers, markers[1:]):
        article = body[m.start():following.start()].strip()
        article = re.split(r'\n第[一二三四五六七八九十]+[章节编]', article)[0].strip()
        if key in ('patAdmin', 'regTrademark'):
            lines = [line for line in article.splitlines()
                     if line not in ('国家知识产权局规章', '国家市场监督管理总局发布', '国家知识产权局发布')
                     and not re.fullmatch(r'[-—]\s*\d+\s*[-—]', line)]
            article = re.sub(r'(?<![。；：])\n(?!（)', '', '\n'.join(lines))
        indexed[m[1]] = article
    articles = []
    for n in map(int, numbers.split()):
        article = indexed.get(numeral(n), '')
        if not 10 <= len(article) <= 4500:
            raise ValueError(f'{key} article {n}: {len(article)} characters')
        articles.append(dict(number=n, label='第'+numeral(n)+'条', content=article))
    today = date.today().isoformat()
    status = '尚未施行' if today < start else '已修改' if end and today >= end else '现行有效'
    return dict(id=key, title=title, status=status, version=version, effective_date=start, end_date=end,
                authority=authority, tier=tier, source_url=url, articles=articles)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--texts', type=Path, help='Verified official text exports for sites requiring a browser')
    args = parser.parse_args()
    with ThreadPoolExecutor(max_workers=5) as pool:
        jobs = [pool.submit(collect, source, args.texts) for source in SOURCES]
        laws = []
        for source, job in zip(SOURCES, jobs):
            try:
                laws.append(job.result())
            except Exception as error:
                print(source.split('|')[0], error)
        if len(laws) != len(SOURCES):
            raise SystemExit('Resolve all source or parser errors before publishing.')
    payload = dict(updated_at=date.today().isoformat(), laws=laws)
    (ROOT/'shared/law-library.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
