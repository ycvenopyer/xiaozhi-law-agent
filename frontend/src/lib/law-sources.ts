import sourceList from '../../../docs/项目升级文档/知识产权常用法规库_权威链接清单.md?raw'

// The directory provides lookup links. Only verified articles enter model context.
const replacements: Record<string, string> = {
  关于审理商标民事纠纷案件适用法律若干问题的解释:
    'https://www.court.gov.cn/fabu/xiangqing/282671.html',
  关于审理专利纠纷案件适用法律问题的若干规定: 'https://ipc.court.gov.cn/zh-cn/news/view-6237.html',
  '关于审理侵犯专利权纠纷案件应用法律若干问题的解释（一）':
    'https://ipc.court.gov.cn/zh-cn/news/view-6239.html',
  '关于审理侵犯专利权纠纷案件应用法律若干问题的解释（二）':
    'https://ipc.court.gov.cn/zh-cn/news/view-6238.html',
  关于知识产权民事诉讼证据的若干规定: 'https://www.court.gov.cn/fabu/xiangqing/272241.html',
  计算机软件保护条例: 'https://ipc.court.gov.cn/zh-cn/news/view-6245.html',
  信息网络传播权保护条例: 'https://xzfg.moj.gov.cn/front/law/detail?LawID=167',
  知识产权海关保护条例: 'https://xzfg.moj.gov.cn/front/law/detail?LawID=52',
  规范商标申请注册行为若干规定:
    'https://www.cnipa.gov.cn/attach/0/5b14f84d13e84b22965eb1983834d16f.pdf',
  商标法: 'https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html',
  关于审理侵害知识产权民事案件适用惩罚性赔偿的解释:
    'https://www.court.gov.cn/zixun/xiangqing/497911.html',
  关于审理著作权民事纠纷案件适用法律若干问题的解释:
    'https://ipc.court.gov.cn/zh-cn/news/view-6242.html',
  关于审理不正当竞争民事案件应用法律若干问题的解释:
    'https://www.court.gov.cn/zixun/xiangqing/351291.html',
  '关于办理侵犯知识产权刑事案件具体应用法律若干问题的解释（三）':
    'https://ipc.court.gov.cn/zh-cn/news/view-4225.html',
  专利优先审查管理办法: 'https://www.cnipa.gov.cn/art/2026/7/30/art_74_207457.html',
  '专利行政执法办法（修改决定）': 'https://www.cnipa.gov.cn/art/2024/12/30/art_99_196969.html',
  '专利审查指南（2023）': 'https://www.cnipa.gov.cn/art/2025/11/14/art_99_202568.html',
}
export const lawSources = sourceList
  .split(/^## /m)
  .filter(s => /^[1-4]\./.test(s))
  .flatMap(section => {
    const group = section.split('\n')[0].replace(/^\d+\.\s*/, '')
    return section
      .split('\n')
      .filter(line => line.startsWith('|'))
      .slice(2)
      .map(row => {
        const cells = row.split('|').map(c => c.trim())
        const title = cells[1]
        const url =
          replacements[title] ||
          cells.at(-2)?.match(/https:\/\/[^\s｜]+/)?.[0] ||
          (group.includes('司法解释')
            ? 'https://www.court.gov.cn/'
            : group.includes('规章')
              ? 'https://www.cnipa.gov.cn/'
              : 'https://flk.npc.gov.cn/')
        const names: Record<string, string> = {
          '商标法（已公布、尚未生效）': '商标法（2026 年修订）',
          关于审理侵害知识产权民事案件适用惩罚性赔偿的解释: '知产惩罚性赔偿解释（2026 年版）',
          关于审理不正当竞争民事案件应用法律若干问题的解释: '反不正当竞争法适用解释（2022 年版）',
          '关于办理侵犯知识产权刑事案件具体应用法律若干问题的解释（三）':
            '办理侵犯知识产权刑事案件的司法解释（2025 年版）',
          '专利行政执法办法（修改决定）': '专利纠纷行政裁决和调解办法',
          '专利审查指南（2023）': '专利审查指南（含修改决定）',
        }
        const links = [...new Set([url, ...(cells.at(-2)?.match(/https:\/\/[^\s｜]+/g) || [])])]
        return { title: names[title] || title, group, url, links }
      })
  })
