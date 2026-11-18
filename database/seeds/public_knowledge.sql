-- Generated from the reviewed public catalog by scripts/write-knowledge-seed.ts.
-- Re-running initialization preserves administrator edits and all user records.
BEGIN;
INSERT INTO public.knowledge_catalog(id, position, entry)
SELECT item->>'id', n, item FROM jsonb_array_elements($catalog$
[
  {
    "id": "law-regTrademark-1",
    "title": "规范商标申请注册行为若干规定 第一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条为了规范商标申请注册行为，规制恶意商标申请，维护商标注册管理秩序，保护社会公共利益，根据《中华人民共和国商标法》（以下简称商标法）和《中华人民共和国商标法实施条例》（以下简称商标法实施条例），制定本规定。",
    "official": {
      "law_title": "规范商标申请注册行为若干规定",
      "article_label": "第一条",
      "version": "市场监管总局令第17号",
      "source_url": "https://www.cnipa.gov.cn/attach/0/5b14f84d13e84b22965eb1983834d16f.pdf",
      "effective_date": "2019-12-01",
      "end_date": "",
      "authority": "国家市场监督管理总局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-regTrademark-2",
    "title": "规范商标申请注册行为若干规定 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条申请商标注册，应当遵守法律、行政法规和部门规章的规定，具有取得商标专用权的实际需要。",
    "official": {
      "law_title": "规范商标申请注册行为若干规定",
      "article_label": "第二条",
      "version": "市场监管总局令第17号",
      "source_url": "https://www.cnipa.gov.cn/attach/0/5b14f84d13e84b22965eb1983834d16f.pdf",
      "effective_date": "2019-12-01",
      "end_date": "",
      "authority": "国家市场监督管理总局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-regTrademark-3",
    "title": "规范商标申请注册行为若干规定 第三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条申请商标注册应当遵循诚实信用原则。不得有下列行为：\n（一）属于商标法第四条规定的不以使用为目的恶意申请商标注册的；\n（二）属于商标法第十三条规定，复制、摹仿或者翻译他人驰名商标的；\n（三）属于商标法第十五条规定，代理人、代表人未经授权申请注册被代理人或者被代表人商标的；基于合同、业务往来关系或者其他关系明知他人在先使用的商标存在而申请注册该商标的；\n（四）属于商标法第三十二条规定，损害他人现有的在先权利或者以不正当手段抢先注册他人已经使用并有一定影响的商标的；\n（五）以欺骗或者其他不正当手段申请商标注册的；\n（六）其他违反诚实信用原则，违背公序良俗，或者有其他不良影响的。",
    "official": {
      "law_title": "规范商标申请注册行为若干规定",
      "article_label": "第三条",
      "version": "市场监管总局令第17号",
      "source_url": "https://www.cnipa.gov.cn/attach/0/5b14f84d13e84b22965eb1983834d16f.pdf",
      "effective_date": "2019-12-01",
      "end_date": "",
      "authority": "国家市场监督管理总局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patAdmin-1",
    "title": "专利纠纷行政裁决和调解办法 第一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条为贯彻党中央、国务院关于强化知识产权保护的决策部署，维护社会主义市场经济秩序，深入推进依法行政，保护专利权人和社会公众的合法权益，规范专利纠纷行政裁决和调解工作，根据《中华人民共和国专利法》《中华人民共和国专利法实施细则》及相关法律法规，制定本办法。",
    "official": {
      "law_title": "专利纠纷行政裁决和调解办法",
      "article_label": "第一条",
      "version": "局令第81号",
      "source_url": "https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=f19e85bad6834f3d8e28f96d1cdfe03f.pdf",
      "effective_date": "2025-02-01",
      "end_date": "",
      "authority": "国家知识产权局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patAdmin-2",
    "title": "专利纠纷行政裁决和调解办法 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条管理专利工作的部门处理专利侵权纠纷、调解专利纠纷，适用本办法。\n管理专利工作的部门开展专利纠纷行政裁决和调解工作中遇到疑难问题的，可以请求上级管理专利工作的部门给予专业指导。",
    "official": {
      "law_title": "专利纠纷行政裁决和调解办法",
      "article_label": "第二条",
      "version": "局令第81号",
      "source_url": "https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=f19e85bad6834f3d8e28f96d1cdfe03f.pdf",
      "effective_date": "2025-02-01",
      "end_date": "",
      "authority": "国家知识产权局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patAdmin-3",
    "title": "专利纠纷行政裁决和调解办法 第三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条管理专利工作的部门处理专利侵权纠纷应当以事实为依据、以法律为准绳，遵循公正、及时的原则。\n管理专利工作的部门调解专利纠纷，应当遵循自愿、合法的原则，促使当事人平等协商达成调解协议。",
    "official": {
      "law_title": "专利纠纷行政裁决和调解办法",
      "article_label": "第三条",
      "version": "局令第81号",
      "source_url": "https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=f19e85bad6834f3d8e28f96d1cdfe03f.pdf",
      "effective_date": "2025-02-01",
      "end_date": "",
      "authority": "国家知识产权局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tmCourt-9",
    "title": "关于审理商标民事纠纷案件适用法律若干问题的解释 第九条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第九条商标法第五十七条第（一）（二）项规定的商标相同，是指被控侵权的商标与原告的注册商标相比较，二者在视觉上基本无差别。\n商标法第五十七条第（二）项规定的商标近似，是指被控侵权的商标与原告的注册商标相比较，其文字的字形、读音、含义或者图形的构图及颜色，或者其各要素组合后的整体结构相似，或者其立体形状、颜色组合近似，易使相关公众对商品的来源产生误认或者认为其来源与原告注册商标的商品有特定的联系。",
    "official": {
      "law_title": "关于审理商标民事纠纷案件适用法律若干问题的解释",
      "article_label": "第九条",
      "version": "法释〔2002〕32号，2020年修正",
      "source_url": "https://www.court.gov.cn/fabu/xiangqing/282671.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tmCourt-10",
    "title": "关于审理商标民事纠纷案件适用法律若干问题的解释 第十条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十条人民法院依据商标法第五十七条第（一）（二）项的规定，认定商标相同或者近似按照以下原则进行：\n（一）以相关公众的一般注意力为标准；\n（二）既要进行对商标的整体比对，又要进行对商标主要部分的比对，比对应当在比对对象隔离的状态下分别进行；\n（三）判断商标是否近似，应当考虑请求保护注册商标的显著性和知名度。",
    "official": {
      "law_title": "关于审理商标民事纠纷案件适用法律若干问题的解释",
      "article_label": "第十条",
      "version": "法释〔2002〕32号，2020年修正",
      "source_url": "https://www.court.gov.cn/fabu/xiangqing/282671.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tmCourt-11",
    "title": "关于审理商标民事纠纷案件适用法律若干问题的解释 第十一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十一条商标法第五十七条第（二）项规定的类似商品，是指在功能、用途、生产部门、销售渠道、消费对象等方面相同，或者相关公众一般认为其存在特定联系、容易造成混淆的商品。\n类似服务，是指在服务的目的、内容、方式、对象等方面相同，或者相关公众一般认为存在特定联系、容易造成混淆的服务。\n商品与服务类似，是指商品和服务之间存在特定联系，容易使相关公众混淆。",
    "official": {
      "law_title": "关于审理商标民事纠纷案件适用法律若干问题的解释",
      "article_label": "第十一条",
      "version": "法释〔2002〕32号，2020年修正",
      "source_url": "https://www.court.gov.cn/fabu/xiangqing/282671.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tmCourt-12",
    "title": "关于审理商标民事纠纷案件适用法律若干问题的解释 第十二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十二条人民法院依据商标法第五十七条第（二）项的规定，认定商品或者服务是否类似，应当以相关公众对商品或者服务的一般认识综合判断；《商标注册用商品和服务国际分类表》《类似商品和服务区分表》可以作为判断类似商品或者服务的参考。",
    "official": {
      "law_title": "关于审理商标民事纠纷案件适用法律若干问题的解释",
      "article_label": "第十二条",
      "version": "法释〔2002〕32号，2020年修正",
      "source_url": "https://www.court.gov.cn/fabu/xiangqing/282671.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-abnormal-2",
    "title": "规范申请专利行为的规定 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条 提出或者代理提出专利申请的，应当遵守法律、行政法规和部门规章的有关规定，遵循专利法立法宗旨，恪守诚实信用原则，以真实发明创造活动为基础，不得弄虚作假，不得违反《中华人民共和国专利法实施细则》第十一条的规定实施非正常申请专利行为。",
    "official": {
      "law_title": "规范申请专利行为的规定",
      "article_label": "第二条",
      "version": "局令第77号",
      "source_url": "https://www.cnipa.gov.cn/art/2023/12/21/art_2790_189475.html",
      "effective_date": "2024-01-20",
      "end_date": "",
      "authority": "国家知识产权局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-abnormal-3",
    "title": "规范申请专利行为的规定 第三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条 本规定所称非正常申请专利行为包括：\n（一）所提出的多件专利申请的发明创造内容明显相同，或者实质上由不同发明创造特征、要素简单组合形成的；\n（二）所提出专利申请存在编造、伪造、变造发明创造内容、实验数据或者技术效果，或者抄袭、简单替换、拼凑现有技术或者现有设计等类似情况的；\n（三）所提出专利申请的发明创造内容主要为利用计算机技术等随机生成的；\n（四）所提出专利申请的发明创造为明显不符合技术改进、设计常理，或者变劣、堆砌、非必要缩限保护范围的；\n（五）申请人无实际研发活动提交多件专利申请，且不能作出合理解释的；\n（六）将实质上与特定单位、个人或者地址关联的多件专利申请恶意分散、先后或者异地提出的；\n（七）出于不正当目的转让、受让专利申请权，或者虚假变更发明人、设计人的；\n（八）违反诚实信用原则、扰乱专利工作正常秩序的其他非正常申请专利行为。",
    "official": {
      "law_title": "规范申请专利行为的规定",
      "article_label": "第三条",
      "version": "局令第77号",
      "source_url": "https://www.cnipa.gov.cn/art/2023/12/21/art_2790_189475.html",
      "effective_date": "2024-01-20",
      "end_date": "",
      "authority": "国家知识产权局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-abnormal-4",
    "title": "规范申请专利行为的规定 第四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四条 任何单位或者个人不得代理、诱导、教唆、帮助他人实施各类非正常申请专利行为。",
    "official": {
      "law_title": "规范申请专利行为的规定",
      "article_label": "第四条",
      "version": "局令第77号",
      "source_url": "https://www.cnipa.gov.cn/art/2023/12/21/art_2790_189475.html",
      "effective_date": "2024-01-20",
      "end_date": "",
      "authority": "国家知识产权局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-evidence-1",
    "title": "关于知识产权民事诉讼证据的若干规定 第一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条知识产权民事诉讼当事人应当遵循诚信原则，依照法律及司法解释的规定，积极、全面、正确、诚实地提供证据。",
    "official": {
      "law_title": "关于知识产权民事诉讼证据的若干规定",
      "article_label": "第一条",
      "version": "法释〔2020〕12号",
      "source_url": "https://www.court.gov.cn/fabu/xiangqing/272241.html",
      "effective_date": "2020-11-18",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-evidence-2",
    "title": "关于知识产权民事诉讼证据的若干规定 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条当事人对自己提出的主张，应当提供证据加以证明。根据案件审理情况，人民法院可以适用民事诉讼法第六十五条第二款的规定，根据当事人的主张及待证事实、当事人的证据持有情况、举证能力等，要求当事人提供有关证据。",
    "official": {
      "law_title": "关于知识产权民事诉讼证据的若干规定",
      "article_label": "第二条",
      "version": "法释〔2020〕12号",
      "source_url": "https://www.court.gov.cn/fabu/xiangqing/272241.html",
      "effective_date": "2020-11-18",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-evidence-3",
    "title": "关于知识产权民事诉讼证据的若干规定 第三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条专利方法制造的产品不属于新产品的，侵害专利权纠纷的原告应当举证证明下列事实：\n（一）被告制造的产品与使用专利方法制造的产品属于相同产品；\n（二）被告制造的产品经由专利方法制造的可能性较大；\n（三）原告为证明被告使用了专利方法尽到合理努力。\n原告完成前款举证后，人民法院可以要求被告举证证明其产品制造方法不同于专利方法。",
    "official": {
      "law_title": "关于知识产权民事诉讼证据的若干规定",
      "article_label": "第三条",
      "version": "法释〔2020〕12号",
      "source_url": "https://www.court.gov.cn/fabu/xiangqing/272241.html",
      "effective_date": "2020-11-18",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-evidence-4",
    "title": "关于知识产权民事诉讼证据的若干规定 第四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四条被告依法主张合法来源抗辩的，应当举证证明合法取得被诉侵权产品、复制品的事实，包括合法的购货渠道、合理的价格和直接的供货方等。\n被告提供的被诉侵权产品、复制品来源证据与其合理注意义务程度相当的，可以认定其完成前款所称举证，并推定其不知道被诉侵权产品、复制品侵害知识产权。被告的经营规模、专业程度、市场交易习惯等，可以作为确定其合理注意义务的证据。",
    "official": {
      "law_title": "关于知识产权民事诉讼证据的若干规定",
      "article_label": "第四条",
      "version": "法释〔2020〕12号",
      "source_url": "https://www.court.gov.cn/fabu/xiangqing/272241.html",
      "effective_date": "2020-11-18",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-evidence-5",
    "title": "关于知识产权民事诉讼证据的若干规定 第五条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五条提起确认不侵害知识产权之诉的原告应当举证证明下列事实：\n（一）被告向原告发出侵权警告或者对原告进行侵权投诉；\n（二）原告向被告发出诉权行使催告及催告时间、送达时间；\n（三）被告未在合理期限内提起诉讼。",
    "official": {
      "law_title": "关于知识产权民事诉讼证据的若干规定",
      "article_label": "第五条",
      "version": "法释〔2020〕12号",
      "source_url": "https://www.court.gov.cn/fabu/xiangqing/272241.html",
      "effective_date": "2020-11-18",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-competition-1",
    "title": "关于适用《中华人民共和国反不正当竞争法》若干问题的解释 第一条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条  经营者扰乱市场竞争秩序，损害其他经营者或者消费者合法权益，且属于违反反不正当竞争法第二章及专利法、商标法、著作权法等规定之外情形的，人民法院可以适用反不正当竞争法第二条予以认定。",
    "official": {
      "law_title": "关于适用《中华人民共和国反不正当竞争法》若干问题的解释",
      "article_label": "第一条",
      "version": "法释〔2022〕9号",
      "source_url": "https://www.court.gov.cn/zixun/xiangqing/351291.html",
      "effective_date": "2022-03-20",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-competition-2",
    "title": "关于适用《中华人民共和国反不正当竞争法》若干问题的解释 第二条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条  与经营者在生产经营活动中存在可能的争夺交易机会、损害竞争优势等关系的市场主体，人民法院可以认定为反不正当竞争法第二条规定的“其他经营者”。",
    "official": {
      "law_title": "关于适用《中华人民共和国反不正当竞争法》若干问题的解释",
      "article_label": "第二条",
      "version": "法释〔2022〕9号",
      "source_url": "https://www.court.gov.cn/zixun/xiangqing/351291.html",
      "effective_date": "2022-03-20",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-competition-4",
    "title": "关于适用《中华人民共和国反不正当竞争法》若干问题的解释 第四条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四条  具有一定的市场知名度并具有区别商品来源的显著特征的标识，人民法院可以认定为反不正当竞争法第六条规定的“有一定影响的”标识。\n人民法院认定反不正当竞争法第六条规定的标识是否具有一定的市场知名度，应当综合考虑中国境内相关公众的知悉程度，商品销售的时间、区域、数额和对象，宣传的持续时间、程度和地域范围，标识受保护的情况等因素。",
    "official": {
      "law_title": "关于适用《中华人民共和国反不正当竞争法》若干问题的解释",
      "article_label": "第四条",
      "version": "法释〔2022〕9号",
      "source_url": "https://www.court.gov.cn/zixun/xiangqing/351291.html",
      "effective_date": "2022-03-20",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-criminal-1",
    "title": "关于办理侵犯知识产权刑事案件适用法律若干问题的解释 第一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条  未经注册商标所有人许可，在同一种商品、服务上使用与其注册商标相同的商标，具有下列情形之一的，应当认定为刑法第二百一十三条规定的“同一种商品、服务”：\n（一）行为人实际生产销售的商品名称、实际提供的服务名称与权利人注册商标核定使用的商品、服务名称相同的；\n（二）商品名称不同，但在功能、用途、主要原料、消费对象、销售渠道等方面相同或者基本相同，相关公众一般认为是同种商品的；\n（三）服务名称不同，但在服务的目的、内容、方式、对象、场所等方面相同或者基本相同，相关公众一般认为是同种服务的。\n认定“同一种商品、服务”，应当在权利人注册商标核定使用的商品、服务和行为人实际生产销售的商品、实际提供的服务之间进行比较。",
    "official": {
      "law_title": "关于办理侵犯知识产权刑事案件适用法律若干问题的解释",
      "article_label": "第一条",
      "version": "法释〔2025〕5号",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-4225.html",
      "effective_date": "2025-04-26",
      "end_date": "",
      "authority": "最高人民法院、最高人民检察院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-criminal-2",
    "title": "关于办理侵犯知识产权刑事案件适用法律若干问题的解释 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条  与被假冒的注册商标完全相同，或者与被假冒的注册商标基本无差别、足以对相关公众产生误导的商标，应当认定为刑法第二百一十三条规定的“与其注册商标相同的商标”。具有下列情形之一的，应当认定为与被假冒的注册商标基本无差别、足以对相关公众产生误导的商标：\n（一）改变注册商标的字体、字母大小写或者文字横竖排列，与注册商标基本无差别的；\n（二）改变注册商标的文字、字母、数字等之间的间距，与注册商标基本无差别的；\n（三）改变注册商标颜色，不影响体现注册商标显著特征的；\n（四）在注册商标上仅增加商品通用名称、型号等缺乏显著特征要素，不影响体现注册商标显著特征的；\n（五）与立体注册商标的三维标志及平面要素基本无差别的；\n（六）其他与注册商标基本无差别、足以对相关公众产生误导的。",
    "official": {
      "law_title": "关于办理侵犯知识产权刑事案件适用法律若干问题的解释",
      "article_label": "第二条",
      "version": "法释〔2025〕5号",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-4225.html",
      "effective_date": "2025-04-26",
      "end_date": "",
      "authority": "最高人民法院、最高人民检察院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-criminal-3",
    "title": "关于办理侵犯知识产权刑事案件适用法律若干问题的解释 第三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条　未经注册商标所有人许可，在同一种商品上使用与其注册商标相同的商标，具有下列情形之一的，应当认定为刑法第二百一十三条规定的“情节严重”：\n（一）违法所得数额在三万元以上或者非法经营数额在五万元以上的；\n（二）假冒两种以上注册商标，违法所得数额在二万元以上或者非法经营数额在三万元以上的；\n（三）二年内因实施刑法第二百一十三条至第二百一十五条规定的行为受过刑事处罚或者行政处罚后再次实施，违法所得数额在二万元以上或者非法经营数额在三万元以上的；\n（四）其他情节严重的情形。\n未经注册商标所有人许可，在同一种服务上使用与其注册商标相同的商标，具有下列情形之一的，应当认定为刑法第二百一十三条规定的“情节严重”：\n（一）违法所得数额在五万元以上的；\n（二）假冒两种以上注册商标，违法所得数额在三万元以上的；\n（三）二年内因实施刑法第二百一十三条至第二百一十五条规定的行为受过刑事处罚或者行政处罚后再次实施，违法所得数额在三万元以上的；\n（四）其他情节严重的情形。\n既假冒商品注册商标，又假冒服务注册商标，假冒商品注册商标的违法所得数额不足本条第一款规定标准，但与假冒服务注册商标的违法所得数额合计达到本条第二款规定标准的，应当认定为刑法第二百一十三条规定的“情节严重”。\n违法所得数额、非法经营数额达到本条前三款相应规定标准十倍以上的，应当认定为刑法第二百一十三条规定的“情节特别严重”。",
    "official": {
      "law_title": "关于办理侵犯知识产权刑事案件适用法律若干问题的解释",
      "article_label": "第三条",
      "version": "法释〔2025〕5号",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-4225.html",
      "effective_date": "2025-04-26",
      "end_date": "",
      "authority": "最高人民法院、最高人民检察院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-copyrightInterp-7",
    "title": "关于审理著作权民事纠纷案件适用法律若干问题的解释 第七条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七条 当事人自行或者委托他人以定购、现场交易等方式购买侵权复制品而取得的实物、发票等，可以作为证据。\n公证人员在未向涉嫌侵权的一方当事人表明身份的情况下，如实对另一方当事人按照前款规定的方式取得的证据和取证过程出具的公证书，应当作为证据使用，但有相反证据的除外。",
    "official": {
      "law_title": "关于审理著作权民事纠纷案件适用法律若干问题的解释",
      "article_label": "第七条",
      "version": "法释〔2002〕31号，2026年修正",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6242.html",
      "effective_date": "2026-09-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-copyrightInterp-8",
    "title": "关于审理著作权民事纠纷案件适用法律若干问题的解释 第八条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第八条 著作权法第十条第一款第一项规定的“公之于众”，是指将作品向不特定的人公开，但不以公众知晓为构成条件。",
    "official": {
      "law_title": "关于审理著作权民事纠纷案件适用法律若干问题的解释",
      "article_label": "第八条",
      "version": "法释〔2002〕31号，2026年修正",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6242.html",
      "effective_date": "2026-09-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-copyrightInterp-9",
    "title": "关于审理著作权民事纠纷案件适用法律若干问题的解释 第九条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第九条 著作权法第十七条第三款所指的作品，著作权人是自然人的，其保护期适用著作权法第二十三条第一款的规定；著作权人是法人或非法人组织的，其保护期适用著作权法第二十三条第二款的规定。",
    "official": {
      "law_title": "关于审理著作权民事纠纷案件适用法律若干问题的解释",
      "article_label": "第九条",
      "version": "法释〔2002〕31号，2026年修正",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6242.html",
      "effective_date": "2026-09-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patentDispute-1",
    "title": "关于审理专利纠纷案件适用法律问题的若干规定 第一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条 人民法院受理下列专利纠纷案件：\n1.专利申请权权属纠纷案件；\n2.专利权权属纠纷案件；\n3.专利合同纠纷案件；\n4.侵害专利权纠纷案件；\n5.假冒他人专利纠纷案件；\n6.发明专利临时保护期使用费纠纷案件；\n7.职务发明创造发明人、设计人奖励、报酬纠纷案件；\n8.诉前申请行为保全纠纷案件；\n9.诉前申请财产保全纠纷案件；\n10.因申请行为保全损害责任纠纷案件；\n11.因申请财产保全损害责任纠纷案件；\n12.发明创造发明人、设计人署名权纠纷案件；\n13.确认不侵害专利权纠纷案件；\n14.专利权宣告无效后返还费用纠纷案件；\n15.因恶意提起专利权诉讼损害责任纠纷案件；\n16.标准必要专利使用费纠纷案件；\n17.不服国务院专利行政部门维持驳回申请复审决定案件；\n18.不服国务院专利行政部门专利权无效宣告请求决定案件；\n19.不服国务院专利行政部门实施强制许可决定案件；\n20.不服国务院专利行政部门实施强制许可使用费裁决案件；\n21.不服国务院专利行政部门行政复议决定案件；\n22.不服国务院专利行政部门作出的其他行政决定案件；\n23.不服管理专利工作的部门行政决定案件；\n24.确认是否落入专利权保护范围纠纷案件；\n25.其他专利纠纷案件。",
    "official": {
      "law_title": "关于审理专利纠纷案件适用法律问题的若干规定",
      "article_label": "第一条",
      "version": "法释〔2001〕21号，2020年修正",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6237.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patentDispute-14",
    "title": "关于审理专利纠纷案件适用法律问题的若干规定 第十四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十四条 专利法第六十五条规定的权利人因被侵权所受到的实际损失可以根据专利权人的专利产品因侵权所造成销售量减少的总数乘以每件专利产品的合理利润所得之积计算。权利人销售量减少的总数难以确定的，侵权产品在市场上销售的总数乘以每件专利产品的合理利润所得之积可以视为权利人因被侵权所受到的实际损失。\n专利法第六十五条规定的侵权人因侵权所获得的利益可以根据该侵权产品在市场上销售的总数乘以每件侵权产品的合理利润所得之积计算。侵权人因侵权所获得的利益一般按照侵权人的营业利润计算，对于完全以侵权为业的侵权人，可以按照销售利润计算。",
    "official": {
      "law_title": "关于审理专利纠纷案件适用法律问题的若干规定",
      "article_label": "第十四条",
      "version": "法释〔2001〕21号，2020年修正",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6237.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patentDispute-15",
    "title": "关于审理专利纠纷案件适用法律问题的若干规定 第十五条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十五条 权利人的损失或者侵权人获得的利益难以确定，有专利许可使用费可以参照的，人民法院可以根据专利权的类型、侵权行为的性质和情节、专利许可的性质、范围、时间等因素，参照该专利许可使用费的倍数合理确定赔偿数额；没有专利许可使用费可以参照或者专利许可使用费明显不合理的，人民法院可以根据专利权的类型、侵权行为的性质和情节等因素，依照专利法第六十五条第二款的规定确定赔偿数额。",
    "official": {
      "law_title": "关于审理专利纠纷案件适用法律问题的若干规定",
      "article_label": "第十五条",
      "version": "法释〔2001〕21号，2020年修正",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6237.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patent2-1",
    "title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释（二） 第一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条 权利要求书有两项以上权利要求的，权利人应当在起诉状中载明据以起诉被诉侵权人侵犯其专利权的权利要求。起诉状对此未记载或者记载不明的，人民法院应当要求权利人明确。经释明，权利人仍不予明确的，人民法院可以裁定驳回起诉。",
    "official": {
      "law_title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释（二）",
      "article_label": "第一条",
      "version": "法释〔2016〕1号，2020年修正",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6238.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patent2-2",
    "title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释（二） 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条 权利人在专利侵权诉讼中主张的权利要求被国务院专利行政部门宣告无效的，审理侵犯专利权纠纷案件的人民法院可以裁定驳回权利人基于该无效权利要求的起诉。\n有证据证明宣告上述权利要求无效的决定被生效的行政判决撤销的，权利人可以另行起诉。\n专利权人另行起诉的，诉讼时效期间从本条第二款所称行政判决书送达之日起计算。",
    "official": {
      "law_title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释（二）",
      "article_label": "第二条",
      "version": "法释〔2016〕1号，2020年修正",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6238.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patent2-22",
    "title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释（二） 第二十二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十二条 对于被诉侵权人主张的现有技术抗辩或者现有设计抗辩，人民法院应当依照专利申请日时施行的专利法界定现有技术或者现有设计。",
    "official": {
      "law_title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释（二）",
      "article_label": "第二十二条",
      "version": "法释〔2016〕1号，2020年修正",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6238.html",
      "effective_date": "2021-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patent1-2",
    "title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条 人民法院应当根据权利要求的记载，结合本领域普通技术人员阅读说明书及附图后对权利要求的理解，确定专利法第五十九条第一款规定的权利要求的内容。",
    "official": {
      "law_title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释",
      "article_label": "第二条",
      "version": "法释〔2009〕21号",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6239.html",
      "effective_date": "2010-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patent1-3",
    "title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释 第三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条 人民法院对于权利要求，可以运用说明书及附图、权利要求书中的相关权利要求、专利审查档案进行解释。说明书对权利要求用语有特别界定的，从其特别界定。\n以上述方法仍不能明确权利要求含义的，可以结合工具书、教科书等公知文献以及本领域普通技术人员的通常理解进行解释。",
    "official": {
      "law_title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释",
      "article_label": "第三条",
      "version": "法释〔2009〕21号",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6239.html",
      "effective_date": "2010-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-patent1-7",
    "title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释 第七条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七条 人民法院判定被诉侵权技术方案是否落入专利权的保护范围，应当审查权利人主张的权利要求所记载的全部技术特征。\n被诉侵权技术方案包含与权利要求记载的全部技术特征相同或者等同的技术特征的，人民法院应当认定其落入专利权的保护范围；被诉侵权技术方案的技术特征与权利要求记载的全部技术特征相比，缺少权利要求记载的一个以上的技术特征，或者有一个以上技术特征不相同也不等同的，人民法院应当认定其没有落入专利权的保护范围。",
    "official": {
      "law_title": "关于审理侵犯专利权纠纷案件应用法律若干问题的解释",
      "article_label": "第七条",
      "version": "法释〔2009〕21号",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6239.html",
      "effective_date": "2010-01-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-customs-2",
    "title": "知识产权海关保护条例 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条　本条例所称知识产权海关保护，是指海关对与进出口货物有关并受中华人民共和国法律、行政法规保护的商标专用权、著作权和与著作权有关的权利、专利权(以下统称知识产权)实施的保护。",
    "official": {
      "law_title": "知识产权海关保护条例",
      "article_label": "第二条",
      "version": "2018年修订",
      "source_url": "https://xzfg.moj.gov.cn/front/law/detail?LawID=52",
      "effective_date": "2018-03-19",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-customs-3",
    "title": "知识产权海关保护条例 第三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条　国家禁止侵犯知识产权的货物进出口。\n海关依照有关法律和本条例的规定实施知识产权保护，行使《中华人民共和国海关法》规定的有关权力。",
    "official": {
      "law_title": "知识产权海关保护条例",
      "article_label": "第三条",
      "version": "2018年修订",
      "source_url": "https://xzfg.moj.gov.cn/front/law/detail?LawID=52",
      "effective_date": "2018-03-19",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-customs-7",
    "title": "知识产权海关保护条例 第七条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七条　知识产权权利人可以依照本条例的规定，将其知识产权向海关总署申请备案；申请备案的，应当提交申请书。申请书应当包括下列内容：\n(一)知识产权权利人的名称或者姓名、注册地或者国籍等；\n(二)知识产权的名称、内容及其相关信息；\n(三)知识产权许可行使状况；\n(四)知识产权权利人合法行使知识产权的货物的名称、产地、进出境地海关、进出口商、主要特征、价格等；\n(五)已知的侵犯知识产权货物的制造商、进出口商、进出境地海关、主要特征、价格等。\n前款规定的申请书内容有证明文件的，知识产权权利人应当附送证明文件。",
    "official": {
      "law_title": "知识产权海关保护条例",
      "article_label": "第七条",
      "version": "2018年修订",
      "source_url": "https://xzfg.moj.gov.cn/front/law/detail?LawID=52",
      "effective_date": "2018-03-19",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-net2013-2",
    "title": "信息网络传播权保护条例 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条　权利人享有的信息网络传播权受著作权法和本条例保护。除法律、行政法规另有规定的外，任何组织或者个人将他人的作品、表演、录音录像制品通过信息网络向公众提供，应当取得权利人许可，并支付报酬。",
    "official": {
      "law_title": "信息网络传播权保护条例",
      "article_label": "第二条",
      "version": "2013年修订",
      "source_url": "https://xzfg.moj.gov.cn/front/law/detail?LawID=167",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-net2013-6",
    "title": "信息网络传播权保护条例 第六条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六条　通过信息网络提供他人作品，属于下列情形的，可以不经著作权人许可，不向其支付报酬：\n(一)为介绍、评论某一作品或者说明某一问题，在向公众提供的作品中适当引用已经发表的作品；\n(二)为报道时事新闻，在向公众提供的作品中不可避免地再现或者引用已经发表的作品；\n(三)为学校课堂教学或者科学研究，向少数教学、科研人员提供少量已经发表的作品；\n(四)国家机关为执行公务，在合理范围内向公众提供已经发表的作品；\n(五)将中国公民、法人或者其他组织已经发表的、以汉语言文字创作的作品翻译成的少数民族语言文字作品，向中国境内少数民族提供；\n(六)不以营利为目的，以盲人能够感知的独特方式向盲人提供已经发表的文字作品；\n(七)向公众提供在信息网络上已经发表的关于政治、经济问题的时事性文章；\n(八)向公众提供在公众集会上发表的讲话。",
    "official": {
      "law_title": "信息网络传播权保护条例",
      "article_label": "第六条",
      "version": "2013年修订",
      "source_url": "https://xzfg.moj.gov.cn/front/law/detail?LawID=167",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-net2013-14",
    "title": "信息网络传播权保护条例 第十四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十四条　对提供信息存储空间或者提供搜索、链接服务的网络服务提供者，权利人认为其服务所涉及的作品、表演、录音录像制品，侵犯自己的信息网络传播权或者被删除、改变了自己的权利管理电子信息的，可以向该网络服务提供者提交书面通知，要求网络服务提供者删除该作品、表演、录音录像制品，或者断开与该作品、表演、录音录像制品的链接。通知书应当包含下列内容：\n(一)权利人的姓名(名称)、联系方式和地址；\n(二)要求删除或者断开链接的侵权作品、表演、录音录像制品的名称和网络地址；\n(三)构成侵权的初步证明材料。\n权利人应当对通知书的真实性负责。",
    "official": {
      "law_title": "信息网络传播权保护条例",
      "article_label": "第十四条",
      "version": "2013年修订",
      "source_url": "https://xzfg.moj.gov.cn/front/law/detail?LawID=167",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-net2013-15",
    "title": "信息网络传播权保护条例 第十五条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十五条　网络服务提供者接到权利人的通知书后，应当立即删除涉嫌侵权的作品、表演、录音录像制品，或者断开与涉嫌侵权的作品、表演、录音录像制品的链接，并同时将通知书转送提供作品、表演、录音录像制品的服务对象；服务对象网络地址不明、无法转送的，应当将通知书的内容同时在信息网络上公告。",
    "official": {
      "law_title": "信息网络传播权保护条例",
      "article_label": "第十五条",
      "version": "2013年修订",
      "source_url": "https://xzfg.moj.gov.cn/front/law/detail?LawID=167",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-priority-1",
    "title": "专利优先审查管理办法 第一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条　为了深入推进知识产权强国建设，规范专利优先审查工作，根据《中华人民共和国专利法》（以下简称专利法）和《中华人民共和国专利法实施细则》（以下简称专利法实施细则）的有关规定，制定本办法。",
    "official": {
      "law_title": "专利优先审查管理办法",
      "article_label": "第一条",
      "version": "局令第85号",
      "source_url": "https://www.cnipa.gov.cn/art/2026/7/30/art_74_207457.html",
      "effective_date": "2026-09-01",
      "end_date": "",
      "authority": "国家知识产权局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-priority-2",
    "title": "专利优先审查管理办法 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条　专利优先审查工作应当坚持党的领导，坚持高质量发展，助力优化营商环境，支撑新质生产力发展，促进创新型国家建设。",
    "official": {
      "law_title": "专利优先审查管理办法",
      "article_label": "第二条",
      "version": "局令第85号",
      "source_url": "https://www.cnipa.gov.cn/art/2026/7/30/art_74_207457.html",
      "effective_date": "2026-09-01",
      "end_date": "",
      "authority": "国家知识产权局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-priority-4",
    "title": "专利优先审查管理办法 第四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四条　下列专利申请或者案件的优先审查适用本办法：\n（一）处于实质审查阶段且未作出首次处理的发明专利申请，首次处理是指审查员已开始审查并发出通知书；\n（二）实用新型和外观设计专利申请；\n（三）发明、实用新型和外观设计专利申请的复审案件（以下简称复审案件）；\n（四）发明、实用新型和外观设计专利的无效宣告案件（以下简称无效宣告案件）。\n依据国家知识产权局与其他国家或者地区专利审查机构签订的双边或者多边协议开展优先审查的，或者经国家级知识产权保护中心、快速维权中心预审合格后开展快速审查的，按照有关规定处理，不适用本办法。",
    "official": {
      "law_title": "专利优先审查管理办法",
      "article_label": "第四条",
      "version": "局令第85号",
      "source_url": "https://www.cnipa.gov.cn/art/2026/7/30/art_74_207457.html",
      "effective_date": "2026-09-01",
      "end_date": "",
      "authority": "国家知识产权局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-agency-1",
    "title": "专利代理管理办法 第一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条 为了规范专利代理行为，保障委托人、专利代理机构以及专利代理师的合法权益，维护专利代理行业的正常秩序，促进专利代理行业健康发展，根据《中华人民共和国专利法》《专利代理条例》以及其他有关法律、行政法规的规定，制定本办法。",
    "official": {
      "law_title": "专利代理管理办法",
      "article_label": "第一条",
      "version": "市场监管总局令第6号",
      "source_url": "https://www.cnipa.gov.cn/art/2019/5/5/art_99_28205.html",
      "effective_date": "2019-05-01",
      "end_date": "",
      "authority": "国家市场监督管理总局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-agency-2",
    "title": "专利代理管理办法 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条 国家知识产权局和省、自治区、直辖市人民政府管理专利工作的部门依法对专利代理机构和专利代理师进行管理和监督。",
    "official": {
      "law_title": "专利代理管理办法",
      "article_label": "第二条",
      "version": "市场监管总局令第6号",
      "source_url": "https://www.cnipa.gov.cn/art/2019/5/5/art_99_28205.html",
      "effective_date": "2019-05-01",
      "end_date": "",
      "authority": "国家市场监督管理总局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-agency-4",
    "title": "专利代理管理办法 第四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四条 专利代理机构和专利代理师可以依法成立和参加全国性或者地方性专利代理行业组织。专利代理行业组织是社会团体，是专利代理师的自律性组织。\n专利代理行业组织应当制定专利代理行业自律规范，行业自律规范不得与法律、行政法规、部门规章相抵触。专利代理机构、专利代理师应当遵守行业自律规范。",
    "official": {
      "law_title": "专利代理管理办法",
      "article_label": "第四条",
      "version": "市场监管总局令第6号",
      "source_url": "https://www.cnipa.gov.cn/art/2019/5/5/art_99_28205.html",
      "effective_date": "2019-05-01",
      "end_date": "",
      "authority": "国家市场监督管理总局",
      "tier": "部门规章",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-3",
    "title": "商标法 第三条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条　经商标局核准注册的商标为注册商标，包括商品商标、服务商标和集体商标、证明商标；商标注册人享有商标专用权，受法律保护。\n本法所称集体商标，是指以团体、协会或者其他组织名义注册，供该组织成员在商事活动中使用，以表明使用者在该组织中的成员资格的标志。\n本法所称证明商标，是指由对某种商品或者服务具有监督能力的组织所控制，而由该组织以外的单位或者个人使用于其商品或者服务，用以证明该商品或者服务的原产地、原料、制造方法、质量或者其他特定品质的标志。\n集体商标、证明商标注册和管理的特殊事项，由国务院工商行政管理部门规定。",
    "official": {
      "law_title": "商标法",
      "article_label": "第三条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-13",
    "title": "商标法 第十三条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十三条　为相关公众所熟知的商标，持有人认为其权利受到侵害时，可以依照本法规定请求驰名商标保护。\n就相同或者类似商品申请注册的商标是复制、摹仿或者翻译他人未在中国注册的驰名商标，容易导致混淆的，不予注册并禁止使用。\n就不相同或者不相类似商品申请注册的商标是复制、摹仿或者翻译他人已经在中国注册的驰名商标，误导公众，致使该驰名商标注册人的利益可能受到损害的，不予注册并禁止使用。",
    "official": {
      "law_title": "商标法",
      "article_label": "第十三条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-32",
    "title": "商标法 第三十二条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三十二条　申请商标注册不得损害他人现有的在先权利，也不得以不正当手段抢先注册他人已经使用并有一定影响的商标。",
    "official": {
      "law_title": "商标法",
      "article_label": "第三十二条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-48",
    "title": "商标法 第四十八条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四十八条　本法所称商标的使用，是指将商标用于商品、商品包装或者容器以及商品交易文书上，或者将商标用于广告宣传、展览以及其他商业活动中，用于识别商品来源的行为。",
    "official": {
      "law_title": "商标法",
      "article_label": "第四十八条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-57",
    "title": "商标法 第五十七条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五十七条　有下列行为之一的，均属侵犯注册商标专用权：\n（一）未经商标注册人的许可，在同一种商品上使用与其注册商标相同的商标的；\n（二）未经商标注册人的许可，在同一种商品上使用与其注册商标近似的商标，或者在类似商品上使用与其注册商标相同或者近似的商标，容易导致混淆的；\n（三）销售侵犯注册商标专用权的商品的；\n（四）伪造、擅自制造他人注册商标标识或者销售伪造、擅自制造的注册商标标识的；\n（五）未经商标注册人同意，更换其注册商标并将该更换商标的商品又投入市场的；\n（六）故意为侵犯他人商标专用权行为提供便利条件，帮助他人实施侵犯商标专用权行为的；\n（七）给他人的注册商标专用权造成其他损害的。",
    "official": {
      "law_title": "商标法",
      "article_label": "第五十七条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-59",
    "title": "商标法 第五十九条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五十九条　注册商标中含有的本商品的通用名称、图形、型号，或者直接表示商品的质量、主要原料、功能、用途、重量、数量及其他特点，或者含有的地名，注册商标专用权人无权禁止他人正当使用。\n三维标志注册商标中含有的商品自身的性质产生的形状、为获得技术效果而需有的商品形状或者使商品具有实质性价值的形状，注册商标专用权人无权禁止他人正当使用。\n商标注册人申请商标注册前，他人已经在同一种商品或者类似商品上先于商标注册人使用与注册商标相同或者近似并有一定影响的商标的，注册商标专用权人无权禁止该使用人在原使用范围内继续使用该商标，但可以要求其附加适当区别标识。",
    "official": {
      "law_title": "商标法",
      "article_label": "第五十九条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-60",
    "title": "商标法 第六十条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十条　有本法第五十七条所列侵犯注册商标专用权行为之一，引起纠纷的，由当事人协商解决；不愿协商或者协商不成的，商标注册人或者利害关系人可以向人民法院起诉，也可以请求工商行政管理部门处理。\n工商行政管理部门处理时，认定侵权行为成立的，责令立即停止侵权行为，没收、销毁侵权商品和主要用于制造侵权商品、伪造注册商标标识的工具，违法经营额五万元以上的，可以处违法经营额五倍以下的罚款，没有违法经营额或者违法经营额不足五万元的，可以处二十五万元以下的罚款。对五年内实施两次以上商标侵权行为或者有其他严重情节的，应当从重处罚。销售不知道是侵犯注册商标专用权的商品，能证明该商品是自己合法取得并说明提供者的，由工商行政管理部门责令停止销售。\n对侵犯商标专用权的赔偿数额的争议，当事人可以请求进行处理的工商行政管理部门调解，也可以依照《中华人民共和国民事诉讼法》向人民法院起诉。经工商行政管理部门调解，当事人未达成协议或者调解书生效后不履行的，当事人可以依照《中华人民共和国民事诉讼法》向人民法院起诉。",
    "official": {
      "law_title": "商标法",
      "article_label": "第六十条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-61",
    "title": "商标法 第六十一条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十一条　对侵犯注册商标专用权的行为，工商行政管理部门有权依法查处；涉嫌犯罪的，应当及时移送司法机关依法处理。",
    "official": {
      "law_title": "商标法",
      "article_label": "第六十一条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-62",
    "title": "商标法 第六十二条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十二条　县级以上工商行政管理部门根据已经取得的违法嫌疑证据或者举报，对涉嫌侵犯他人注册商标专用权的行为进行查处时，可以行使下列职权：\n（一）询问有关当事人，调查与侵犯他人注册商标专用权有关的情况；\n（二）查阅、复制当事人与侵权活动有关的合同、发票、账簿以及其他有关资料；\n（三）对当事人涉嫌从事侵犯他人注册商标专用权活动的场所实施现场检查；\n（四）检查与侵权活动有关的物品；对有证据证明是侵犯他人注册商标专用权的物品，可以查封或者扣押。\n工商行政管理部门依法行使前款规定的职权时，当事人应当予以协助、配合，不得拒绝、阻挠。\n在查处商标侵权案件过程中，对商标权属存在争议或者权利人同时向人民法院提起商标侵权诉讼的，工商行政管理部门可以中止案件的查处。中止原因消除后，应当恢复或者终结案件查处程序。",
    "official": {
      "law_title": "商标法",
      "article_label": "第六十二条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-63",
    "title": "商标法 第六十三条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十三条　侵犯商标专用权的赔偿数额，按照权利人因被侵权所受到的实际损失确定；实际损失难以确定的，可以按照侵权人因侵权所获得的利益确定；权利人的损失或者侵权人获得的利益难以确定的，参照该商标许可使用费的倍数合理确定。对恶意侵犯商标专用权，情节严重的，可以在按照上述方法确定数额的一倍以上五倍以下确定赔偿数额。赔偿数额应当包括权利人为制止侵权行为所支付的合理开支。\n人民法院为确定赔偿数额，在权利人已经尽力举证，而与侵权行为相关的账簿、资料主要由侵权人掌握的情况下，可以责令侵权人提供与侵权行为相关的账簿、资料；侵权人不提供或者提供虚假的账簿、资料的，人民法院可以参考权利人的主张和提供的证据判定赔偿数额。\n权利人因被侵权所受到的实际损失、侵权人因侵权所获得的利益、注册商标许可使用费难以确定的，由人民法院根据侵权行为的情节判决给予五百万元以下的赔偿。\n人民法院审理商标纠纷案件，应权利人请求，对属于假冒注册商标的商品，除特殊情况外，责令销毁；对主要用于制造假冒注册商标的商品的材料、工具，责令销毁，且不予补偿；或者在特殊情况下，责令禁止前述材料、工具进入商业渠道，且不予补偿。\n假冒注册商标的商品不得在仅去除假冒注册商标后进入商业渠道。",
    "official": {
      "law_title": "商标法",
      "article_label": "第六十三条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm19-64",
    "title": "商标法 第六十四条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十四条　注册商标专用权人请求赔偿，被控侵权人以注册商标专用权人未使用注册商标提出抗辩的，人民法院可以要求注册商标专用权人提供此前三年内实际使用该注册商标的证据。注册商标专用权人不能证明此前三年内实际使用过该注册商标，也不能证明因侵权行为受到其他损失的，被控侵权人不承担赔偿责任。\n销售不知道是侵犯注册商标专用权的商品，能证明该商品是自己合法取得并说明提供者的，不承担赔偿责任。",
    "official": {
      "law_title": "商标法",
      "article_label": "第六十四条",
      "version": "2019年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2019/7/30/art_95_28179.html",
      "effective_date": "2019-11-01",
      "end_date": "2027-01-01",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm26-2",
    "title": "商标法 第二条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条　本法所称商标，是指用以识别和区分商品或者服务来源的标志，包括商品商标和服务商标。本法有关商品商标的规定，适用于服务商标。\n本法所称商标的使用，是指将商标用于商品、商品包装或者容器以及商品交易文书上，或者将商标用于广告宣传、展览以及其他商业活动中，用于识别和区分商品来源的行为。\n前款所称商标的使用，包括通过互联网等信息网络实施的使用行为。",
    "official": {
      "law_title": "商标法",
      "article_label": "第二条",
      "version": "2026年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/6/26/art_3686_206940.html",
      "effective_date": "2027-01-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm26-72",
    "title": "商标法 第七十二条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十二条　有下列行为之一的，均属侵犯注册商标专用权：\n（一）未经商标注册人的许可，在同一种商品上使用与其注册商标相同的商标；\n（二）未经商标注册人的许可，在同一种商品上使用与其注册商标近似的商标，或者在类似商品上使用与其注册商标相同或者近似的商标，容易导致混淆；\n（三）销售侵犯注册商标专用权的商品；\n（四）伪造、擅自制造他人注册商标标识或者销售伪造、擅自制造的注册商标标识；\n（五）未经商标注册人同意，更换其注册商标并将该更换商标的商品又投入市场；\n（六）故意为侵犯他人注册商标专用权行为提供便利条件，帮助他人实施侵犯注册商标专用权的行为；\n（七）给他人的注册商标专用权造成其他损害。",
    "official": {
      "law_title": "商标法",
      "article_label": "第七十二条",
      "version": "2026年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/6/26/art_3686_206940.html",
      "effective_date": "2027-01-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm26-73",
    "title": "商标法 第七十三条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十三条　注册商标中含有的本商品的通用名称、图形、型号，或者直接表示商品的种类、性质、质量、主要原料、功能、用途、重量、数量、价值、地理来源及其他特点，或者含有的地名，注册商标专用权人无权禁止他人正当使用。\n三维标志、颜色组合、声音、动态标志等注册商标中含有的由商品自身的性质产生的、为获得技术效果而需有的或者使商品具有实质性价值的形状、颜色组合、声音、动态效果等，注册商标专用权人无权禁止他人正当使用。\n仅为指示所提供商品的用途、适用对象、应用场景等信息或者表明真实来源，使用相关注册商标的，注册商标专用权人无权禁止他人正当使用，但容易导致混淆的除外。\n商标注册人申请商标注册前，他人已经在同一种商品或者类似商品上先于商标注册人使用与注册商标相同或者近似并有一定影响的商标的，注册商标专用权人无权禁止该使用人在原使用范围内继续使用该商标，但可以要求其附加适当区别标识。",
    "official": {
      "law_title": "商标法",
      "article_label": "第七十三条",
      "version": "2026年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/6/26/art_3686_206940.html",
      "effective_date": "2027-01-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm26-74",
    "title": "商标法 第七十四条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十四条　有本法第七十二条所列侵犯注册商标专用权行为之一，引起纠纷的，由当事人协商解决；不愿协商或者协商不成的，商标注册人或者利害关系人可以向人民法院起诉，也可以请求负责商标执法的部门处理。\n负责商标执法的部门处理时，认定侵权行为成立的，责令立即停止侵权行为，没收侵权商品和主要用于制造侵权商品、伪造注册商标标识的工具，违法经营额五万元以上的，可以并处违法经营额五倍以下的罚款，没有违法经营额或者违法经营额不足五万元的，可以并处二十五万元以下的罚款。对五年内实施两次以上商标侵权行为或者有其他严重情节的，应当从重处罚。销售不知道是侵犯注册商标专用权的商品，能证明该商品是自己合法取得并说明提供者的，由负责商标执法的部门责令停止销售。\n对侵犯注册商标专用权的赔偿数额的争议，当事人可以请求负责商标执法的部门调解，也可以依照《中华人民共和国民事诉讼法》向人民法院起诉。经负责商标执法的部门调解，当事人未达成协议或者调解书生效后不履行的，当事人可以依照《中华人民共和国民事诉讼法》向人民法院起诉。",
    "official": {
      "law_title": "商标法",
      "article_label": "第七十四条",
      "version": "2026年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/6/26/art_3686_206940.html",
      "effective_date": "2027-01-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm26-77",
    "title": "商标法 第七十七条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十七条　侵犯注册商标专用权的赔偿数额，按照权利人因被侵权所受到的实际损失或者侵权人因侵权所获得的利益确定；权利人的损失或者侵权人获得的利益难以确定的，参照该商标许可使用费的倍数合理确定。对故意侵犯注册商标专用权，情节严重的，可以在按照上述方法确定数额的一倍以上五倍以下确定赔偿数额。\n人民法院为确定赔偿数额，在权利人已经尽力举证，而与侵权行为相关的账簿、资料主要由侵权人掌握的情况下，可以责令侵权人提供与侵权行为相关的账簿、资料；侵权人不提供或者提供虚假的账簿、资料的，人民法院可以参考权利人的主张和提供的证据判定赔偿数额。\n权利人因被侵权所受到的实际损失、侵权人因侵权所获得的利益、注册商标许可使用费难以确定的，由人民法院根据侵权行为的情节判决给予五百万元以下的赔偿。\n赔偿数额还应当包括权利人为制止侵权行为所支付的合理开支。\n人民法院审理商标纠纷案件，应权利人请求，对属于假冒注册商标的商品，除特殊情况外，责令销毁；对主要用于制造假冒注册商标的商品的材料、工具，责令销毁，且不予补偿；或者在特殊情况下，责令禁止前述材料、工具进入商业渠道，且不予补偿。\n假冒注册商标的商品不得在仅去除假冒注册商标后进入商业渠道。",
    "official": {
      "law_title": "商标法",
      "article_label": "第七十七条",
      "version": "2026年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/6/26/art_3686_206940.html",
      "effective_date": "2027-01-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm26-81",
    "title": "商标法 第八十一条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第八十一条　对以恶意串通、单方捏造基本事实等方式提起商标诉讼的，由人民法院依法给予处罚；给对方当事人造成损失的，应当依法承担民事责任。",
    "official": {
      "law_title": "商标法",
      "article_label": "第八十一条",
      "version": "2026年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/6/26/art_3686_206940.html",
      "effective_date": "2027-01-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-6",
    "title": "专利法 第六条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六条　执行本单位的任务或者主要是利用本单位的物质技术条件所完成的发明创造为职务发明创造。职务发明创造申请专利的权利属于该单位，申请被批准后，该单位为专利权人。该单位可以依法处置其职务发明创造申请专利的权利和专利权，促进相关发明创造的实施和运用。\n非职务发明创造，申请专利的权利属于发明人或者设计人；申请被批准后，该发明人或者设计人为专利权人。\n利用本单位的物质技术条件所完成的发明创造，单位与发明人或者设计人订有合同，对申请专利的权利和专利权的归属作出约定的，从其约定。",
    "official": {
      "law_title": "专利法",
      "article_label": "第六条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-10",
    "title": "专利法 第十条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十条　专利申请权和专利权可以转让。\n中国单位或者个人向外国人、外国企业或者外国其他组织转让专利申请权或者专利权的，应当依照有关法律、行政法规的规定办理手续。\n转让专利申请权或者专利权的，当事人应当订立书面合同，并向国务院专利行政部门登记，由国务院专利行政部门予以公告。专利申请权或者专利权的转让自登记之日起生效。",
    "official": {
      "law_title": "专利法",
      "article_label": "第十条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-11",
    "title": "专利法 第十一条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十一条　发明和实用新型专利权被授予后，除本法另有规定的以外，任何单位或者个人未经专利权人许可，都不得实施其专利，即不得为生产经营目的制造、使用、许诺销售、销售、进口其专利产品，或者使用其专利方法以及使用、许诺销售、销售、进口依照该专利方法直接获得的产品。\n外观设计专利权被授予后，任何单位或者个人未经专利权人许可，都不得实施其专利，即不得为生产经营目的制造、许诺销售、销售、进口其外观设计专利产品。",
    "official": {
      "law_title": "专利法",
      "article_label": "第十一条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-16",
    "title": "专利法 第十六条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十六条　发明人或者设计人有权在专利文件中写明自己是发明人或者设计人。\n专利权人有权在其专利产品或者该产品的包装上标明专利标识。",
    "official": {
      "law_title": "专利法",
      "article_label": "第十六条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-19",
    "title": "专利法 第十九条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十九条　任何单位或者个人将在中国完成的发明或者实用新型向外国申请专利的，应当事先报经国务院专利行政部门进行保密审查。保密审查的程序、期限等按照国务院的规定执行。\n中国单位或者个人可以根据中华人民共和国参加的有关国际条约提出专利国际申请。申请人提出专利国际申请的，应当遵守前款规定。\n国务院专利行政部门依照中华人民共和国参加的有关国际条约、本法和国务院有关规定处理专利国际申请。\n对违反本条第一款规定向外国申请专利的发明或者实用新型，在中国申请专利的，不授予专利权。",
    "official": {
      "law_title": "专利法",
      "article_label": "第十九条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-22",
    "title": "专利法 第二十二条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十二条　授予专利权的发明和实用新型，应当具备新颖性、创造性和实用性。\n新颖性，是指该发明或者实用新型不属于现有技术；也没有任何单位或者个人就同样的发明或者实用新型在申请日以前向国务院专利行政部门提出过申请，并记载在申请日以后公布的专利申请文件或者公告的专利文件中。\n创造性，是指与现有技术相比，该发明具有突出的实质性特点和显著的进步，该实用新型具有实质性特点和进步。\n实用性，是指该发明或者实用新型能够制造或者使用，并且能够产生积极效果。\n本法所称现有技术，是指申请日以前在国内外为公众所知的技术。",
    "official": {
      "law_title": "专利法",
      "article_label": "第二十二条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-23",
    "title": "专利法 第二十三条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十三条　授予专利权的外观设计，应当不属于现有设计；也没有任何单位或者个人就同样的外观设计在申请日以前向国务院专利行政部门提出过申请，并记载在申请日以后公告的专利文件中。\n授予专利权的外观设计与现有设计或者现有设计特征的组合相比，应当具有明显区别。\n授予专利权的外观设计不得与他人在申请日以前已经取得的合法权利相冲突。\n本法所称现有设计，是指申请日以前在国内外为公众所知的设计。",
    "official": {
      "law_title": "专利法",
      "article_label": "第二十三条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-26",
    "title": "专利法 第二十六条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十六条　申请发明或者实用新型专利的，应当提交请求书、说明书及其摘要和权利要求书等文件。\n请求书应当写明发明或者实用新型的名称，发明人的姓名，申请人姓名或者名称、地址，以及其他事项。\n说明书应当对发明或者实用新型作出清楚、完整的说明，以所属技术领域的技术人员能够实现为准；必要的时候，应当有附图。摘要应当简要说明发明或者实用新型的技术要点。\n权利要求书应当以说明书为依据，清楚、简要地限定要求专利保护的范围。\n依赖遗传资源完成的发明创造，申请人应当在专利申请文件中说明该遗传资源的直接来源和原始来源；申请人无法说明原始来源的，应当陈述理由。",
    "official": {
      "law_title": "专利法",
      "article_label": "第二十六条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-39",
    "title": "专利法 第三十九条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三十九条　发明专利申请经实质审查没有发现驳回理由的，由国务院专利行政部门作出授予发明专利权的决定，发给发明专利证书，同时予以登记和公告。发明专利权自公告之日起生效。",
    "official": {
      "law_title": "专利法",
      "article_label": "第三十九条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-42",
    "title": "专利法 第四十二条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四十二条　发明专利权的期限为二十年，实用新型专利权的期限为十年，外观设计专利权的期限为十五年，均自申请日起计算。\n自发明专利申请日起满四年，且自实质审查请求之日起满三年后授予发明专利权的，国务院专利行政部门应专利权人的请求，就发明专利在授权过程中的不合理延迟给予专利权期限补偿，但由申请人引起的不合理延迟除外。\n为补偿新药上市审评审批占用的时间，对在中国获得上市许可的新药相关发明专利，国务院专利行政部门应专利权人的请求给予专利权期限补偿。补偿期限不超过五年，新药批准上市后总有效专利权期限不超过十四年。",
    "official": {
      "law_title": "专利法",
      "article_label": "第四十二条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-64",
    "title": "专利法 第六十四条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十四条　发明或者实用新型专利权的保护范围以其权利要求的内容为准，说明书及附图可以用于解释权利要求的内容。\n外观设计专利权的保护范围以表示在图片或者照片中的该产品的外观设计为准，简要说明可以用于解释图片或者照片所表示的该产品的外观设计。",
    "official": {
      "law_title": "专利法",
      "article_label": "第六十四条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-65",
    "title": "专利法 第六十五条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十五条　未经专利权人许可，实施其专利，即侵犯其专利权，引起纠纷的，由当事人协商解决；不愿协商或者协商不成的，专利权人或者利害关系人可以向人民法院起诉，也可以请求管理专利工作的部门处理。管理专利工作的部门处理时，认定侵权行为成立的，可以责令侵权人立即停止侵权行为，当事人不服的，可以自收到处理通知之日起十五日内依照《中华人民共和国行政诉讼法》向人民法院起诉；侵权人期满不起诉又不停止侵权行为的，管理专利工作的部门可以申请人民法院强制执行。进行处理的管理专利工作的部门应当事人的请求，可以就侵犯专利权的赔偿数额进行调解；调解不成的，当事人可以依照《中华人民共和国民事诉讼法》向人民法院起诉。",
    "official": {
      "law_title": "专利法",
      "article_label": "第六十五条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-66",
    "title": "专利法 第六十六条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十六条　专利侵权纠纷涉及新产品制造方法的发明专利的，制造同样产品的单位或者个人应当提供其产品制造方法不同于专利方法的证明。\n专利侵权纠纷涉及实用新型专利或者外观设计专利的，人民法院或者管理专利工作的部门可以要求专利权人或者利害关系人出具由国务院专利行政部门对相关实用新型或者外观设计进行检索、分析和评价后作出的专利权评价报告，作为审理、处理专利侵权纠纷的证据；专利权人、利害关系人或者被控侵权人也可以主动出具专利权评价报告。",
    "official": {
      "law_title": "专利法",
      "article_label": "第六十六条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-67",
    "title": "专利法 第六十七条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十七条　在专利侵权纠纷中，被控侵权人有证据证明其实施的技术或者设计属于现有技术或者现有设计的，不构成侵犯专利权。",
    "official": {
      "law_title": "专利法",
      "article_label": "第六十七条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-70",
    "title": "专利法 第七十条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十条　国务院专利行政部门可以应专利权人或者利害关系人的请求处理在全国有重大影响的专利侵权纠纷。\n地方人民政府管理专利工作的部门应专利权人或者利害关系人请求处理专利侵权纠纷，对在本行政区域内侵犯其同一专利权的案件可以合并处理；对跨区域侵犯其同一专利权的案件可以请求上级地方人民政府管理专利工作的部门处理。",
    "official": {
      "law_title": "专利法",
      "article_label": "第七十条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-71",
    "title": "专利法 第七十一条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十一条　侵犯专利权的赔偿数额按照权利人因被侵权所受到的实际损失或者侵权人因侵权所获得的利益确定；权利人的损失或者侵权人获得的利益难以确定的，参照该专利许可使用费的倍数合理确定。对故意侵犯专利权，情节严重的，可以在按照上述方法确定数额的一倍以上五倍以下确定赔偿数额。\n权利人的损失、侵权人获得的利益和专利许可使用费均难以确定的，人民法院可以根据专利权的类型、侵权行为的性质和情节等因素，确定给予三万元以上五百万元以下的赔偿。\n赔偿数额还应当包括权利人为制止侵权行为所支付的合理开支。\n人民法院为确定赔偿数额，在权利人已经尽力举证，而与侵权行为相关的账簿、资料主要由侵权人掌握的情况下，可以责令侵权人提供与侵权行为相关的账簿、资料；侵权人不提供或者提供虚假的账簿、资料的，人民法院可以参考权利人的主张和提供的证据判定赔偿数额。",
    "official": {
      "law_title": "专利法",
      "article_label": "第七十一条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-72",
    "title": "专利法 第七十二条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十二条　专利权人或者利害关系人有证据证明他人正在实施或者即将实施侵犯专利权、妨碍其实现权利的行为，如不及时制止将会使其合法权益受到难以弥补的损害的，可以在起诉前依法向人民法院申请采取财产保全、责令作出一定行为或者禁止作出一定行为的措施。",
    "official": {
      "law_title": "专利法",
      "article_label": "第七十二条",
      "version": "2020年修正",
      "source_url": "https://www.cnipa.gov.cn/art/2020/11/23/art_97_155167.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-2",
    "title": "著作权法 第二条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条 中国公民、法人或者非法人组织的作品，不论是否发表，依照本法享有著作权。\n外国人、无国籍人的作品根据其作者所属国或者经常居住地国同中国签订的协议或者共同参加的国际条约享有的著作权，受本法保护。\n外国人、无国籍人的作品首先在中国境内出版的，依照本法享有著作权。\n未与中国签订协议或者共同参加国际条约的国家的作者以及无国籍人的作品首次在中国参加的国际条约的成员国出版的，或者在成员国和非成员国同时出版的，受本法保护。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第二条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-3",
    "title": "著作权法 第三条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条 本法所称的作品，是指文学、艺术和科学领域内具有独创性并能以一定形式表现的智力成果，包括：\n（一）文字作品；\n（二）口述作品；\n（三）音乐、戏剧、曲艺、舞蹈、杂技艺术作品；\n（四）美术、建筑作品；\n（五）摄影作品；\n（六）视听作品；\n（七）工程设计图、产品设计图、地图、示意图等图形作品和模型作品；\n（八）计算机软件；\n（九）符合作品特征的其他智力成果。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第三条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-5",
    "title": "著作权法 第五条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五条 本法不适用于：\n（一）法律、法规，国家机关的决议、决定、命令和其他具有立法、行政、司法性质的文件，及其官方正式译文；\n（二）单纯事实消息；\n（三）历法、通用数表、通用表格和公式。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第五条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-9",
    "title": "著作权法 第九条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第九条 著作权人包括：\n（一）作者；\n（二）其他依照本法享有著作权的自然人、法人或者非法人组织。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第九条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-10",
    "title": "著作权法 第十条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十条 著作权包括下列人身权和财产权：\n（一）发表权，即决定作品是否公之于众的权利；\n（二）署名权，即表明作者身份，在作品上署名的权利；\n（三）修改权，即修改或者授权他人修改作品的权利；\n（四）保护作品完整权，即保护作品不受歪曲、篡改的权利；\n（五）复制权，即以印刷、复印、拓印、录音、录像、翻录、翻拍、数字化等方式将作品制作一份或者多份的权利；\n（六）发行权，即以出售或者赠与方式向公众提供作品的原件或者复制件的权利；\n（七）出租权，即有偿许可他人临时使用视听作品、计算机软件的原件或者复制件的权利，计算机软件不是出租的主要标的的除外；\n（八）展览权，即公开陈列美术作品、摄影作品的原件或者复制件的权利；\n（九）表演权，即公开表演作品，以及用各种手段公开播送作品的表演的权利；\n（十）放映权，即通过放映机、幻灯机等技术设备公开再现美术、摄影、视听作品等的权利；\n（十一）广播权，即以有线或者无线方式公开传播或者转播作品，以及通过扩音器或者其他传送符号、声音、图像的类似工具向公众传播广播的作品的权利，但不包括本款第十二项规定的权利；\n（十二）信息网络传播权，即以有线或者无线方式向公众提供，使公众可以在其选定的时间和地点获得作品的权利；\n（十三）摄制权，即以摄制视听作品的方法将作品固定在载体上的权利；\n（十四）改编权，即改变作品，创作出具有独创性的新作品的权利；\n（十五）翻译权，即将作品从一种语言文字转换成另一种语言文字的权利；\n（十六）汇编权，即将作品或者作品的片段通过选择或者编排，汇集成新作品的权利；\n（十七）应当由著作权人享有的其他权利。\n著作权人可以许可他人行使前款第五项至第十七项规定的权利，并依照约定或者本法有关规定获得报酬。\n著作权人可以全部或者部分转让本条第一款第五项至第十七项规定的权利，并依照约定或者本法有关规定获得报酬。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第十条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-11",
    "title": "著作权法 第十一条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十一条 著作权属于作者，本法另有规定的除外。\n创作作品的自然人是作者。\n由法人或者非法人组织主持，代表法人或者非法人组织意志创作，并由法人或者非法人组织承担责任的作品，法人或者非法人组织视为作者。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第十一条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-12",
    "title": "著作权法 第十二条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十二条 在作品上署名的自然人、法人或者非法人组织为作者，且该作品上存在相应权利，但有相反证明的除外。\n作者等著作权人可以向国家著作权主管部门认定的登记机构办理作品登记。\n与著作权有关的权利参照适用前两款规定。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第十二条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-18",
    "title": "著作权法 第十八条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十八条 自然人为完成法人或者非法人组织工作任务所创作的作品是职务作品，除本条第二款的规定以外，著作权由作者享有，但法人或者非法人组织有权在其业务范围内优先使用。作品完成两年内，未经单位同意，作者不得许可第三人以与单位使用的相同方式使用该作品。\n有下列情形之一的职务作品，作者享有署名权，著作权的其他权利由法人或者非法人组织享有，法人或者非法人组织可以给予作者奖励：\n（一）主要是利用法人或者非法人组织的物质技术条件创作，并由法人或者非法人组织承担责任的工程设计图、产品设计图、地图、示意图、计算机软件等职务作品；\n（二）报社、期刊社、通讯社、广播电台、电视台的工作人员创作的职务作品；\n（三）法律、行政法规规定或者合同约定著作权由法人或者非法人组织享有的职务作品。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第十八条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-19",
    "title": "著作权法 第十九条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十九条 受委托创作的作品，著作权的归属由委托人和受托人通过合同约定。合同未作明确约定或者没有订立合同的，著作权属于受托人。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第十九条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-24",
    "title": "著作权法 第二十四条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十四条 在下列情况下使用作品，可以不经著作权人许可，不向其支付报酬，但应当指明作者姓名或者名称、作品名称，并且不得影响该作品的正常使用，也不得不合理地损害著作权人的合法权益：\n（一）为个人学习、研究或者欣赏，使用他人已经发表的作品；\n（二）为介绍、评论某一作品或者说明某一问题，在作品中适当引用他人已经发表的作品；\n（三）为报道新闻，在报纸、期刊、广播电台、电视台等媒体中不可避免地再现或者引用已经发表的作品；\n（四）报纸、期刊、广播电台、电视台等媒体刊登或者播放其他报纸、期刊、广播电台、电视台等媒体已经发表的关于政治、经济、宗教问题的时事性文章，但著作权人声明不许刊登、播放的除外；\n（五）报纸、期刊、广播电台、电视台等媒体刊登或者播放在公众集会上发表的讲话，但作者声明不许刊登、播放的除外；\n（六）为学校课堂教学或者科学研究，翻译、改编、汇编、播放或者少量复制已经发表的作品，供教学或者科研人员使用，但不得出版发行；\n（七）国家机关为执行公务在合理范围内使用已经发表的作品；\n（八）图书馆、档案馆、纪念馆、博物馆、美术馆、文化馆等为陈列或者保存版本的需要，复制本馆收藏的作品；\n（九）免费表演已经发表的作品，该表演未向公众收取费用，也未向表演者支付报酬，且不以营利为目的；\n（十）对设置或者陈列在公共场所的艺术作品进行临摹、绘画、摄影、录像；\n（十一）将中国公民、法人或者非法人组织已经发表的以国家通用语言文字创作的作品翻译成少数民族语言文字作品在国内出版发行；\n（十二）以阅读障碍者能够感知的无障碍方式向其提供已经发表的作品；\n（十三）法律、行政法规规定的其他情形。\n前款规定适用于对与著作权有关的权利的限制。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第二十四条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-25",
    "title": "著作权法 第二十五条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十五条 为实施义务教育和国家教育规划而编写出版教科书，可以不经著作权人许可，在教科书中汇编已经发表的作品片段或者短小的文字作品、音乐作品或者单幅的美术作品、摄影作品、图形作品，但应当按照规定向著作权人支付报酬，指明作者姓名或者名称、作品名称，并且不得侵犯著作权人依照本法享有的其他权利。\n前款规定适用于对与著作权有关的权利的限制。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第二十五条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-26",
    "title": "著作权法 第二十六条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十六条 使用他人作品应当同著作权人订立许可使用合同，本法规定可以不经许可的除外。\n许可使用合同包括下列主要内容：\n（一）许可使用的权利种类；\n（二）许可使用的权利是专有使用权或者非专有使用权；\n（三）许可使用的地域范围、期间；\n（四）付酬标准和办法；\n（五）违约责任；\n（六）双方认为需要约定的其他内容。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第二十六条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-27",
    "title": "著作权法 第二十七条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十七条 转让本法第十条第一款第五项至第十七项规定的权利，应当订立书面合同。\n权利转让合同包括下列主要内容：\n（一）作品的名称；\n（二）转让的权利种类、地域范围；\n（三）转让价金；\n（四）交付转让价金的日期和方式；\n（五）违约责任；\n（六）双方认为需要约定的其他内容。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第二十七条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-37",
    "title": "著作权法 第三十七条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三十七条 出版者有权许可或者禁止他人使用其出版的图书、期刊的版式设计。\n前款规定的权利的保护期为十年，截止于使用该版式设计的图书、期刊首次出版后第十年的12月31日。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第三十七条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-40",
    "title": "著作权法 第四十条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四十条 演员为完成本演出单位的演出任务进行的表演为职务表演，演员享有表明身份和保护表演形象不受歪曲的权利，其他权利归属由当事人约定。当事人没有约定或者约定不明确的，职务表演的权利由演出单位享有。\n职务表演的权利由演员享有的，演出单位可以在其业务范围内免费使用该表演。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第四十条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-44",
    "title": "著作权法 第四十四条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四十四条 录音录像制作者对其制作的录音录像制品，享有许可他人复制、发行、出租、通过信息网络向公众传播并获得报酬的权利；权利的保护期为五十年，截止于该制品首次制作完成后第五十年的12月31日。\n被许可人复制、发行、通过信息网络向公众传播录音录像制品，应当同时取得著作权人、表演者许可，并支付报酬；被许可人出租录音录像制品，还应当取得表演者许可，并支付报酬。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第四十四条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-50",
    "title": "著作权法 第五十条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五十条 下列情形可以避开技术措施，但不得向他人提供避开技术措施的技术、装置或者部件，不得侵犯权利人依法享有的其他权利：\n（一）为学校课堂教学或者科学研究，提供少量已经发表的作品，供教学或者科研人员使用，而该作品无法通过正常途径获取；\n（二）不以营利为目的，以阅读障碍者能够感知的无障碍方式向其提供已经发表的作品，而该作品无法通过正常途径获取；\n（三）国家机关依照行政、监察、司法程序执行公务；\n（四）对计算机及其系统或者网络的安全性能进行测试；\n（五）进行加密研究或者计算机软件反向工程研究。\n前款规定适用于对与著作权有关的权利的限制。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第五十条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-52",
    "title": "著作权法 第五十二条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五十二条 有下列侵权行为的，应当根据情况，承担停止侵害、消除影响、赔礼道歉、赔偿损失等民事责任：\n（一）未经著作权人许可，发表其作品的；\n（二）未经合作作者许可，将与他人合作创作的作品当作自己单独创作的作品发表的；\n（三）没有参加创作，为谋取个人名利，在他人作品上署名的；\n（四）歪曲、篡改他人作品的；\n（五）剽窃他人作品的；\n（六）未经著作权人许可，以展览、摄制视听作品的方法使用作品，或者以改编、翻译、注释等方式使用作品的，本法另有规定的除外；\n（七）使用他人作品，应当支付报酬而未支付的；\n（八）未经视听作品、计算机软件、录音录像制品的著作权人、表演者或者录音录像制作者许可，出租其作品或者录音录像制品的原件或者复制件的，本法另有规定的除外；\n（九）未经出版者许可，使用其出版的图书、期刊的版式设计的；\n（十）未经表演者许可，从现场直播或者公开传送其现场表演，或者录制其表演的；\n（十一）其他侵犯著作权以及与著作权有关的权利的行为。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第五十二条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-53",
    "title": "著作权法 第五十三条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五十三条 有下列侵权行为的，应当根据情况，承担本法第五十二条规定的民事责任；侵权行为同时损害公共利益的，由主管著作权的部门责令停止侵权行为，予以警告，没收违法所得，没收、无害化销毁处理侵权复制品以及主要用于制作侵权复制品的材料、工具、设备等，违法经营额五万元以上的，可以并处违法经营额一倍以上五倍以下的罚款；没有违法经营额、违法经营额难以计算或者不足五万元的，可以并处二十五万元以下的罚款；构成犯罪的，依法追究刑事责任：\n（一）未经著作权人许可，复制、发行、表演、放映、广播、汇编、通过信息网络向公众传播其作品的，本法另有规定的除外；\n（二）出版他人享有专有出版权的图书的；\n（三）未经表演者许可，复制、发行录有其表演的录音录像制品，或者通过信息网络向公众传播其表演的，本法另有规定的除外；\n（四）未经录音录像制作者许可，复制、发行、通过信息网络向公众传播其制作的录音录像制品的，本法另有规定的除外；\n（五）未经许可，播放、复制或者通过信息网络向公众传播广播、电视的，本法另有规定的除外；\n（六）未经著作权人或者与著作权有关的权利人许可，故意避开或者破坏技术措施的，故意制造、进口或者向他人提供主要用于避开、破坏技术措施的装置或者部件的，或者故意为他人避开或者破坏技术措施提供技术服务的，法律、行政法规另有规定的除外；\n（七）未经著作权人或者与著作权有关的权利人许可，故意删除或者改变作品、版式设计、表演、录音录像制品或者广播、电视上的权利管理信息的，知道或者应当知道作品、版式设计、表演、录音录像制品或者广播、电视上的权利管理信息未经许可被删除或者改变，仍然向公众提供的，法律、行政法规另有规定的除外；\n（八）制作、出售假冒他人署名的作品的。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第五十三条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-54",
    "title": "著作权法 第五十四条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五十四条 侵犯著作权或者与著作权有关的权利的，侵权人应当按照权利人因此受到的实际损失或者侵权人的违法所得给予赔偿；权利人的实际损失或者侵权人的违法所得难以计算的，可以参照该权利使用费给予赔偿。对故意侵犯著作权或者与著作权有关的权利，情节严重的，可以在按照上述方法确定数额的一倍以上五倍以下给予赔偿。\n权利人的实际损失、侵权人的违法所得、权利使用费难以计算的，由人民法院根据侵权行为的情节，判决给予五百元以上五百万元以下的赔偿。\n赔偿数额还应当包括权利人为制止侵权行为所支付的合理开支。\n人民法院为确定赔偿数额，在权利人已经尽了必要举证责任，而与侵权行为相关的账簿、资料等主要由侵权人掌握的，可以责令侵权人提供与侵权行为相关的账簿、资料等；侵权人不提供，或者提供虚假的账簿、资料等的，人民法院可以参考权利人的主张和提供的证据确定赔偿数额。\n人民法院审理著作权纠纷案件，应权利人请求，对侵权复制品，除特殊情况外，责令销毁；对主要用于制造侵权复制品的材料、工具、设备等，责令销毁，且不予补偿；或者在特殊情况下，责令禁止前述材料、工具、设备等进入商业渠道，且不予补偿。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第五十四条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-55",
    "title": "著作权法 第五十五条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五十五条 主管著作权的部门对涉嫌侵犯著作权和与著作权有关的权利的行为进行查处时，可以询问有关当事人，调查与涉嫌违法行为有关的情况；对当事人涉嫌违法行为的场所和物品实施现场检查；查阅、复制与涉嫌违法行为有关的合同、发票、账簿以及其他有关资料；对于涉嫌违法行为的场所和物品，可以查封或者扣押。\n主管著作权的部门依法行使前款规定的职权时，当事人应当予以协助、配合，不得拒绝、阻挠。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第五十五条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-56",
    "title": "著作权法 第五十六条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五十六条 著作权人或者与著作权有关的权利人有证据证明他人正在实施或者即将实施侵犯其权利、妨碍其实现权利的行为，如不及时制止将会使其合法权益受到难以弥补的损害的，可以在起诉前依法向人民法院申请采取财产保全、责令作出一定行为或者禁止作出一定行为等措施。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第五十六条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-65",
    "title": "著作权法 第六十五条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六十五条 摄影作品，其发表权、本法第十条第一款第五项至第十七项规定的权利的保护期在2021年6月1日前已经届满，但依据本法第二十三条第一款的规定仍在保护期内的，不再保护。",
    "official": {
      "law_title": "著作权法",
      "article_label": "第六十五条",
      "version": "2020年修正",
      "source_url": "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
      "effective_date": "2021-06-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-uc-2",
    "title": "反不正当竞争法 第二条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条　经营者在生产经营活动中，应当遵循自愿、平等、公平、诚信的原则，遵守法律和商业道德，公平参与市场竞争。\n本法所称的不正当竞争行为，是指经营者在生产经营活动中，违反本法规定，扰乱市场竞争秩序，损害其他经营者或者消费者的合法权益的行为。\n本法所称的经营者，是指从事商品生产、经营或者提供服务（以下所称商品包括服务）的自然人、法人和非法人组织。",
    "official": {
      "law_title": "反不正当竞争法",
      "article_label": "第二条",
      "version": "2025年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html",
      "effective_date": "2025-10-15",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-uc-7",
    "title": "反不正当竞争法 第七条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七条　经营者不得实施下列混淆行为，引人误认为是他人商品或者与他人存在特定联系：\n（一）擅自使用与他人有一定影响的商品名称、包装、装潢等相同或者近似的标识；\n（二）擅自使用他人有一定影响的名称（包括简称、字号等）、姓名（包括笔名、艺名、网名、译名等）；\n（三）擅自使用他人有一定影响的域名主体部分、网站名称、网页、新媒体账号名称、应用程序名称或者图标等；\n（四）其他足以引人误认为是他人商品或者与他人存在特定联系的混淆行为。\n擅自将他人注册商标、未注册的驰名商标作为企业名称中的字号使用，或者将他人商品名称、企业名称（包括简称、字号等）、注册商标、未注册的驰名商标等设置为搜索关键词，引人误认为是他人商品或者与他人存在特定联系的，属于前款规定的混淆行为。\n经营者不得帮助他人实施混淆行为。",
    "official": {
      "law_title": "反不正当竞争法",
      "article_label": "第七条",
      "version": "2025年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html",
      "effective_date": "2025-10-15",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-uc-9",
    "title": "反不正当竞争法 第九条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第九条　经营者不得对其商品的性能、功能、质量、销售状况、用户评价、曾获荣誉等作虚假或者引人误解的商业宣传，欺骗、误导消费者和其他经营者。\n经营者不得通过组织虚假交易、虚假评价等方式，帮助其他经营者进行虚假或者引人误解的商业宣传。",
    "official": {
      "law_title": "反不正当竞争法",
      "article_label": "第九条",
      "version": "2025年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html",
      "effective_date": "2025-10-15",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-uc-10",
    "title": "反不正当竞争法 第十条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十条　经营者不得实施下列侵犯商业秘密的行为：\n（一）以盗窃、贿赂、欺诈、胁迫、电子侵入或者其他不正当手段获取权利人的商业秘密；\n（二）披露、使用或者允许他人使用以前项手段获取的权利人的商业秘密；\n（三）违反保密义务或者违反权利人有关保守商业秘密的要求，披露、使用或者允许他人使用其所掌握的商业秘密；\n（四）教唆、引诱、帮助他人违反保密义务或者违反权利人有关保守商业秘密的要求，获取、披露、使用或者允许他人使用权利人的商业秘密。\n经营者以外的其他自然人、法人和非法人组织实施前款所列违法行为的，视为侵犯商业秘密。\n第三人明知或者应知商业秘密权利人的员工、前员工或者其他单位、个人实施本条第一款所列违法行为，仍获取、披露、使用或者允许他人使用该商业秘密的，视为侵犯商业秘密。\n本法所称的商业秘密，是指不为公众所知悉、具有商业价值并经权利人采取相应保密措施的技术信息、经营信息等商业信息。",
    "official": {
      "law_title": "反不正当竞争法",
      "article_label": "第十条",
      "version": "2025年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html",
      "effective_date": "2025-10-15",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-uc-11",
    "title": "反不正当竞争法 第十一条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十一条　经营者进行有奖销售不得存在下列情形：\n（一）所设奖的种类、兑奖条件、奖金金额或者奖品等有奖销售信息不明确，影响兑奖；\n（二）有奖销售活动开始后，无正当理由变更所设奖的种类、兑奖条件、奖金金额或者奖品等有奖销售信息；\n（三）采用谎称有奖或者故意让内定人员中奖等欺骗方式进行有奖销售；\n（四）抽奖式的有奖销售，最高奖的金额超过五万元。",
    "official": {
      "law_title": "反不正当竞争法",
      "article_label": "第十一条",
      "version": "2025年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html",
      "effective_date": "2025-10-15",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-uc-12",
    "title": "反不正当竞争法 第十二条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十二条　经营者不得编造、传播或者指使他人编造、传播虚假信息或者误导性信息，损害其他经营者的商业信誉、商品声誉。",
    "official": {
      "law_title": "反不正当竞争法",
      "article_label": "第十二条",
      "version": "2025年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html",
      "effective_date": "2025-10-15",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-uc-13",
    "title": "反不正当竞争法 第十三条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十三条　经营者利用网络从事生产经营活动，应当遵守本法的各项规定。\n经营者不得利用数据和算法、技术、平台规则等，通过影响用户选择或者其他方式，实施下列妨碍、破坏其他经营者合法提供的网络产品或者服务正常运行的行为：\n（一）未经其他经营者同意，在其合法提供的网络产品或者服务中，插入链接、强制进行目标跳转；\n（二）误导、欺骗、强迫用户修改、关闭、卸载其他经营者合法提供的网络产品或者服务；\n（三）恶意对其他经营者合法提供的网络产品或者服务实施不兼容；\n（四）其他妨碍、破坏其他经营者合法提供的网络产品或者服务正常运行的行为。\n经营者不得以欺诈、胁迫、避开或者破坏技术管理措施等不正当方式，获取、使用其他经营者合法持有的数据，损害其他经营者的合法权益，扰乱市场竞争秩序。\n经营者不得滥用平台规则，直接或者指使他人对其他经营者实施虚假交易、虚假评价或者恶意退货等行为，损害其他经营者的合法权益，扰乱市场竞争秩序。",
    "official": {
      "law_title": "反不正当竞争法",
      "article_label": "第十三条",
      "version": "2025年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html",
      "effective_date": "2025-10-15",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-uc-22",
    "title": "反不正当竞争法 第二十二条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十二条　经营者违反本法规定，给他人造成损害的，应当依法承担民事责任。\n经营者的合法权益受到不正当竞争行为损害的，可以向人民法院提起诉讼。\n因不正当竞争行为受到损害的经营者的赔偿数额，按照其因被侵权所受到的实际损失或者侵权人因侵权所获得的利益确定。经营者故意实施侵犯商业秘密行为，情节严重的，可以在按照上述方法确定数额的一倍以上五倍以下确定赔偿数额。赔偿数额还应当包括经营者为制止侵权行为所支付的合理开支。\n经营者违反本法第七条、第十条规定，权利人因被侵权所受到的实际损失、侵权人因侵权所获得的利益难以确定的，由人民法院根据侵权行为的情节判决给予权利人五百万元以下的赔偿。",
    "official": {
      "law_title": "反不正当竞争法",
      "article_label": "第二十二条",
      "version": "2025年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html",
      "effective_date": "2025-10-15",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-uc-26",
    "title": "反不正当竞争法 第二十六条",
    "category": "反不正当竞争法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十六条　经营者以及其他自然人、法人和非法人组织违反本法第十条规定侵犯商业秘密的，由监督检查部门责令停止违法行为，没收违法所得，处十万元以上一百万元以下的罚款；情节严重的，处一百万元以上五百万元以下的罚款。",
    "official": {
      "law_title": "反不正当竞争法",
      "article_label": "第二十六条",
      "version": "2025年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2026/5/20/art_104_206437.html",
      "effective_date": "2025-10-15",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-reg-11",
    "title": "专利法实施细则 第十一条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十一条　申请专利应当遵循诚实信用原则。提出各类专利申请应当以真实发明创造活动为基础，不得弄虚作假。",
    "official": {
      "law_title": "专利法实施细则",
      "article_label": "第十一条",
      "version": "2023年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html",
      "effective_date": "2024-01-20",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-reg-12",
    "title": "专利法实施细则 第十二条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十二条　除专利法第二十八条和第四十二条规定的情形外，专利法所称申请日，有优先权的，指优先权日。\n本细则所称申请日，除另有规定的外，是指专利法第二十八条规定的申请日。",
    "official": {
      "law_title": "专利法实施细则",
      "article_label": "第十二条",
      "version": "2023年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html",
      "effective_date": "2024-01-20",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-reg-13",
    "title": "专利法实施细则 第十三条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十三条　专利法第六条所称执行本单位的任务所完成的职务发明创造，是指：\n（一）在本职工作中作出的发明创造；\n（二）履行本单位交付的本职工作之外的任务所作出的发明创造；\n（三）退休、调离原单位后或者劳动、人事关系终止后1年内作出的，与其在原单位承担的本职工作或者原单位分配的任务有关的发明创造。\n专利法第六条所称本单位，包括临时工作单位；专利法第六条所称本单位的物质技术条件，是指本单位的资金、设备、零部件、原材料或者不对外公开的技术信息和资料等。",
    "official": {
      "law_title": "专利法实施细则",
      "article_label": "第十三条",
      "version": "2023年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html",
      "effective_date": "2024-01-20",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-reg-14",
    "title": "专利法实施细则 第十四条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十四条　专利法所称发明人或者设计人，是指对发明创造的实质性特点作出创造性贡献的人。在完成发明创造过程中，只负责组织工作的人、为物质技术条件的利用提供方便的人或者从事其他辅助工作的人，不是发明人或者设计人。",
    "official": {
      "law_title": "专利法实施细则",
      "article_label": "第十四条",
      "version": "2023年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html",
      "effective_date": "2024-01-20",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-reg-92",
    "title": "专利法实施细则 第九十二条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第九十二条　被授予专利权的单位可以与发明人、设计人约定或者在其依法制定的规章制度中规定专利法第十五条规定的奖励、报酬的方式和数额。鼓励被授予专利权的单位实行产权激励，采取股权、期权、分红等方式，使发明人或者设计人合理分享创新收益。\n企业、事业单位给予发明人或者设计人的奖励、报酬，按照国家有关财务、会计制度的规定进行处理。",
    "official": {
      "law_title": "专利法实施细则",
      "article_label": "第九十二条",
      "version": "2023年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html",
      "effective_date": "2024-01-20",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-pat-reg-93",
    "title": "专利法实施细则 第九十三条",
    "category": "专利法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第九十三条　被授予专利权的单位未与发明人、设计人约定也未在其依法制定的规章制度中规定专利法第十五条规定的奖励的方式和数额的，应当自公告授予专利权之日起3个月内发给发明人或者设计人奖金。一项发明专利的奖金最低不少于4000元；一项实用新型专利或者外观设计专利的奖金最低不少于1500元。\n由于发明人或者设计人的建议被其所属单位采纳而完成的发明创造，被授予专利权的单位应当从优发给奖金。",
    "official": {
      "law_title": "专利法实施细则",
      "article_label": "第九十三条",
      "version": "2023年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html",
      "effective_date": "2024-01-20",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-damages-1",
    "title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释 第一条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第一条 原告主张被告故意侵害其依法享有的知识产权且情节严重，请求判令被告承担惩罚性赔偿责任的，人民法院应当依法审理。",
    "official": {
      "law_title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释",
      "article_label": "第一条",
      "version": "法释〔2026〕7号",
      "source_url": "https://www.court.gov.cn/zixun/xiangqing/497911.html",
      "effective_date": "2026-05-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-damages-2",
    "title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释 第二条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条 原告请求惩罚性赔偿的，应当提出明确的赔偿数额、计算方法以及所依据的事实和理由。",
    "official": {
      "law_title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释",
      "article_label": "第二条",
      "version": "法释〔2026〕7号",
      "source_url": "https://www.court.gov.cn/zixun/xiangqing/497911.html",
      "effective_date": "2026-05-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-damages-3",
    "title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释 第三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条 原告在一审法庭辩论终结前增加惩罚性赔偿请求的，人民法院应当准许。在二审中增加惩罚性赔偿请求的，人民法院可以根据当事人自愿原则进行调解，调解不成的，不予支持。",
    "official": {
      "law_title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释",
      "article_label": "第三条",
      "version": "法释〔2026〕7号",
      "source_url": "https://www.court.gov.cn/zixun/xiangqing/497911.html",
      "effective_date": "2026-05-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-damages-4",
    "title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释 第四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第四条 原告在知识产权侵权诉讼中请求赔偿损失但未请求惩罚性赔偿，经人民法院释明仍未请求，诉讼终结后基于同一侵权事实另行起诉请求惩罚性赔偿的，人民法院不予受理。",
    "official": {
      "law_title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释",
      "article_label": "第四条",
      "version": "法释〔2026〕7号",
      "source_url": "https://www.court.gov.cn/zixun/xiangqing/497911.html",
      "effective_date": "2026-05-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-damages-5",
    "title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释 第五条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第五条 原告针对被告故意实施侵犯商业秘密以外的不正当竞争行为请求惩罚性赔偿的，人民法院不予支持，但法律另有规定的除外。",
    "official": {
      "law_title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释",
      "article_label": "第五条",
      "version": "法释〔2026〕7号",
      "source_url": "https://www.court.gov.cn/zixun/xiangqing/497911.html",
      "effective_date": "2026-05-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-damages-6",
    "title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释 第六条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六条 对于侵害知识产权故意的认定，人民法院应当综合考虑知识产权客体的类型、权利状态和知名度，被告与原告或者利害关系人的关系等因素。\n被告有下列情形之一的，人民法院可以认定其具有侵害知识产权的故意，但当事人有相反证据足以反驳的除外：\n（一）经原告或者利害关系人有效通知后，仍继续实施侵权行为的；\n（二）被告或其法定代表人、管理人是原告或者利害关系人的法定代表人、管理人、实际控制人，知道或者应当知道被侵害的知识产权的；\n（三）与原告或者利害关系人之间存在劳动、劳务、合作、许可、经销、代理、代表等关系，且基于前述关系接触过被侵害的知识产权的；\n（四）与原告或者利害关系人之间有业务往来或者为达成合同等进行过磋商，且基于前述关系接触过被侵害的知识产权的；\n（五）实施盗版、假冒注册商标、假冒他人专利行为的；\n（六）与原告达成和解并同意停止侵权行为后，再次实施相同或者类似侵权行为的；\n（七）通过设立关联公司、变更法定代表人或者控股股东、隐名设立公司等方式掩盖实际控制关系，或者签订免责协议，逃避侵害涉案知识产权法律责任的；\n（八）其他可以认定为故意的情形。",
    "official": {
      "law_title": "关于审理侵害知识产权民事纠纷案件适用惩罚性赔偿的解释",
      "article_label": "第六条",
      "version": "法释〔2026〕7号",
      "source_url": "https://www.court.gov.cn/zixun/xiangqing/497911.html",
      "effective_date": "2026-05-01",
      "end_date": "",
      "authority": "最高人民法院",
      "tier": "L3",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-software-6",
    "title": "计算机软件保护条例 第六条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六条 本条例对软件著作权的保护不延及开发软件所用的思想、处理过程、操作方法或者数学概念等。",
    "official": {
      "law_title": "计算机软件保护条例",
      "article_label": "第六条",
      "version": "2013年修订",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6245.html",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-software-8",
    "title": "计算机软件保护条例 第八条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第八条 软件著作权人享有下列各项权利：\n（一）发表权，即决定软件是否公之于众的权利；\n（二）署名权，即表明开发者身份，在软件上署名的权利；\n（三）修改权，即对软件进行增补、删节，或者改变指令、语句顺序的权利；\n（四）复制权，即将软件制作一份或者多份的权利；\n（五）发行权，即以出售或者赠与方式向公众提供软件的原件或者复制件的权利；\n（六）出租权，即有偿许可他人临时使用软件的权利，但是软件不是出租的主要标的的除外；\n（七）信息网络传播权，即以有线或者无线方式向公众提供软件，使公众可以在其个人选定的时间和地点获得软件的权利；\n（八）翻译权，即将原软件从一种自然语言文字转换成另一种自然语言文字的权利；\n（九）应当由软件著作权人享有的其他权利。\n软件著作权人可以许可他人行使其软件著作权，并有权获得报酬。\n软件著作权人可以全部或者部分转让其软件著作权，并有权获得报酬。",
    "official": {
      "law_title": "计算机软件保护条例",
      "article_label": "第八条",
      "version": "2013年修订",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6245.html",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-software-13",
    "title": "计算机软件保护条例 第十三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十三条 自然人在法人或者其他组织中任职期间所开发的软件有下列情形之一的，该软件著作权由该法人或者其他组织享有，该法人或者其他组织可以对开发软件的自然人进行奖励：\n（一）针对本职工作中明确指定的开发目标所开发的软件；\n（二）开发的软件是从事本职工作活动所预见的结果或者自然的结果；\n（三）主要使用了法人或者其他组织的资金、专用设备、未公开的专门信息等物质技术条件所开发并由法人或者其他组织承担责任的软件。",
    "official": {
      "law_title": "计算机软件保护条例",
      "article_label": "第十三条",
      "version": "2013年修订",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6245.html",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-software-14",
    "title": "计算机软件保护条例 第十四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十四条 软件著作权自软件开发完成之日起产生。\n自然人的软件著作权，保护期为自然人终生及其死亡后50年，截止于自然人死亡后第50年的12月31日；软件是合作开发的，截止于最后死亡的自然人死亡后第50年的12月31日。\n法人或者其他组织的软件著作权，保护期为50年，截止于软件首次发表后第50年的12月31日，但软件自开发完成之日起50年内未发表的，本条例不再保护。",
    "official": {
      "law_title": "计算机软件保护条例",
      "article_label": "第十四条",
      "version": "2013年修订",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6245.html",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-software-16",
    "title": "计算机软件保护条例 第十六条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十六条 软件的合法复制品所有人享有下列权利：\n（一）根据使用的需要把该软件装入计算机等具有信息处理能力的装置内；\n（二）为了防止复制品损坏而制作备份复制品。这些备份复制品不得通过任何方式提供给他人使用，并在所有人丧失该合法复制品的所有权时，负责将备份复制品销毁；\n（三）为了把该软件用于实际的计算机应用环境或者改进其功能、性能而进行必要的修改；但是，除合同另有约定外，未经该软件著作权人许可，不得向任何第三方提供修改后的软件。",
    "official": {
      "law_title": "计算机软件保护条例",
      "article_label": "第十六条",
      "version": "2013年修订",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6245.html",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-software-17",
    "title": "计算机软件保护条例 第十七条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第十七条 为了学习和研究软件内含的设计思想和原理，通过安装、显示、传输或者存储软件等方式使用软件的，可以不经软件著作权人许可，不向其支付报酬。",
    "official": {
      "law_title": "计算机软件保护条例",
      "article_label": "第十七条",
      "version": "2013年修订",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6245.html",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-software-24",
    "title": "计算机软件保护条例 第二十四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十四条 除《中华人民共和国著作权法》、本条例或者其他法律、行政法规另有规定外，未经软件著作权人许可，有下列侵权行为的，应当根据情况，承担停止侵害、消除影响、赔礼道歉、赔偿损失等民事责任；同时损害社会公共利益的，由著作权行政管理部门责令停止侵权行为，没收违法所得，没收、销毁侵权复制品，可以并处罚款；情节严重的，著作权行政管理部门并可以没收主要用于制作侵权复制品的材料、工具、设备等；触犯刑律的，依照刑法关于侵犯著作权罪、销售侵权复制品罪的规定，依法追究刑事责任：\n（一）复制或者部分复制著作权人的软件的；\n（二）向公众发行、出租、通过信息网络传播著作权人的软件的；\n（三）故意避开或者破坏著作权人为保护其软件著作权而采取的技术措施的；\n（四）故意删除或者改变软件权利管理电子信息的；\n（五）转让或者许可他人行使著作权人的软件著作权的。\n有前款第一项或者第二项行为的，可以并处每件100元或者货值金额1倍以上5倍以下的罚款；有前款第三项、第四项或者第五项行为的，可以并处20万元以下的罚款。",
    "official": {
      "law_title": "计算机软件保护条例",
      "article_label": "第二十四条",
      "version": "2013年修订",
      "source_url": "https://ipc.court.gov.cn/zh-cn/news/view-6245.html",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-reg-2",
    "title": "著作权法实施条例 第二条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二条 著作权法所称作品，是指文学、艺术和科学领域内具有独创性并能以某种有形形式复制的智力成果。",
    "official": {
      "law_title": "著作权法实施条例",
      "article_label": "第二条",
      "version": "2013年修订",
      "source_url": "https://www.gov.cn/zhengce/2013-02/08/content_2602616.htm",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-reg-3",
    "title": "著作权法实施条例 第三条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第三条 著作权法所称创作，是指直接产生文学、艺术和科学作品的智力活动。\n为他人创作进行组织工作，提供咨询意见、物质条件，或者进行其他辅助工作，均不视为创作。",
    "official": {
      "law_title": "著作权法实施条例",
      "article_label": "第三条",
      "version": "2013年修订",
      "source_url": "https://www.gov.cn/zhengce/2013-02/08/content_2602616.htm",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-reg-6",
    "title": "著作权法实施条例 第六条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第六条 著作权自作品创作完成之日起产生。",
    "official": {
      "law_title": "著作权法实施条例",
      "article_label": "第六条",
      "version": "2013年修订",
      "source_url": "https://www.gov.cn/zhengce/2013-02/08/content_2602616.htm",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-cr-reg-21",
    "title": "著作权法实施条例 第二十一条",
    "category": "著作权法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十一条 依照著作权法有关规定，使用可以不经著作权人许可的已经发表的作品的，不得影响该作品的正常使用，也不得不合理地损害著作权人的合法利益。",
    "official": {
      "law_title": "著作权法实施条例",
      "article_label": "第二十一条",
      "version": "2013年修订",
      "source_url": "https://www.gov.cn/zhengce/2013-02/08/content_2602616.htm",
      "effective_date": "2013-03-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm-reg-75",
    "title": "商标法实施条例 第七十五条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十五条　为侵犯他人商标专用权提供仓储、运输、邮寄、印制、隐匿、经营场所、网络商品交易平台等，属于商标法第五十七条第六项规定的提供便利条件。",
    "official": {
      "law_title": "商标法实施条例",
      "article_label": "第七十五条",
      "version": "2014年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2015/9/14/art_96_28188.html",
      "effective_date": "2014-05-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm-reg-76",
    "title": "商标法实施条例 第七十六条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十六条　在同一种商品或者类似商品上将与他人注册商标相同或者近似的标志作为商品名称或者商品装潢使用，误导公众的，属于商标法第五十七条第二项规定的侵犯注册商标专用权的行为。",
    "official": {
      "law_title": "商标法实施条例",
      "article_label": "第七十六条",
      "version": "2014年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2015/9/14/art_96_28188.html",
      "effective_date": "2014-05-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-tm-reg-77",
    "title": "商标法实施条例 第七十七条",
    "category": "商标法",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第七十七条　对侵犯注册商标专用权的行为，任何人可以向工商行政管理部门投诉或者举报。",
    "official": {
      "law_title": "商标法实施条例",
      "article_label": "第七十七条",
      "version": "2014年修订",
      "source_url": "https://www.cnipa.gov.cn/art/2015/9/14/art_96_28188.html",
      "effective_date": "2014-05-01",
      "end_date": "",
      "authority": "国务院",
      "tier": "L2",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-labor-23",
    "title": "劳动合同法 第二十三条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十三条　用人单位与劳动者可以在劳动合同中约定保守用人单位的商业秘密和与知识产权相关的保密事项。\n对负有保密义务的劳动者，用人单位可以在劳动合同或者保密协议中与劳动者约定竞业限制条款，并约定在解除或者终止劳动合同后，在竞业限制期限内按月给予劳动者经济补偿。劳动者违反竞业限制约定的，应当按照约定向用人单位支付违约金。",
    "official": {
      "law_title": "劳动合同法",
      "article_label": "第二十三条",
      "version": "2012年修正",
      "source_url": "https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_0abfdd261c03417b949df19d869add8d.html",
      "effective_date": "2013-07-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-labor-24",
    "title": "劳动合同法 第二十四条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第二十四条　竞业限制的人员限于用人单位的高级管理人员、高级技术人员和其他负有保密义务的人员。竞业限制的范围、地域、期限由用人单位与劳动者约定，竞业限制的约定不得违反法律、法规的规定。\n在解除或者终止劳动合同后，前款规定的人员到与本单位生产或者经营同类产品、从事同类业务的有竞争关系的其他用人单位，或者自己开业生产或者经营同类产品、从事同类业务的竞业限制期限，不得超过二年。",
    "official": {
      "law_title": "劳动合同法",
      "article_label": "第二十四条",
      "version": "2012年修正",
      "source_url": "https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_0abfdd261c03417b949df19d869add8d.html",
      "effective_date": "2013-07-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "law-labor-90",
    "title": "劳动合同法 第九十条",
    "category": "其他",
    "kind": "law",
    "builtin": true,
    "enabled": true,
    "content": "第九十条　劳动者违反本法规定解除劳动合同，或者违反劳动合同中约定的保密义务或者竞业限制，给用人单位造成损失的，应当承担赔偿责任。",
    "official": {
      "law_title": "劳动合同法",
      "article_label": "第九十条",
      "version": "2012年修正",
      "source_url": "https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_0abfdd261c03417b949df19d869add8d.html",
      "effective_date": "2013-07-01",
      "end_date": "",
      "authority": "全国人大常委会",
      "tier": "L1",
      "updated_at": "2026-11-18"
    }
  },
  {
    "id": "seed-case-tm-1",
    "title": "【案例】\"非诚勿扰\"商标侵权及不正当竞争案",
    "category": "商标法",
    "kind": "case",
    "enabled": false,
    "content": "基本案情：金阿欢在第45类\"交友服务、婚姻介绍所\"上注册\"非诚勿扰\"商标，主张江苏省广播电视总台《非诚勿扰》节目使用相同名称构成侵权。争议焦点：电视节目名称的使用是否属于商标性使用、与第45类服务是否构成类似服务。裁判要旨：最高人民法院再审认为，电视节目名称在商业活动中用于识别服务来源，构成商标性使用；婚恋交友类电视节目与第45类婚姻介绍服务在目的、内容、对象上高度重合，构成类似服务，容易导致混淆，判令停止使用\"非诚勿扰\"节目名称。典型意义：明确了电视节目名称的商标性使用认定及服务类似性判断标准（最高人民法院（2016）最高法民再字第X号，供学习参考）。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-case-tm-2",
    "title": "【案例】\"乔丹\"商标争议行政案",
    "category": "商标法",
    "kind": "case",
    "enabled": false,
    "content": "基本案情：迈克尔·乔丹主张乔丹体育股份有限公司申请注册的中文\"乔丹\"及拼音\"QIAODAN\"等系列商标损害其姓名权，请求商标评审委员会宣告无效。争议焦点：争议商标是否损害在先姓名权、是否构成\"以不正当手段抢先注册他人已经使用并有一定影响的商标\"。裁判要旨：最高人民法院认定，\"乔丹\"作为迈克尔·乔丹的中文译名，已形成稳定对应关系，争议商标的注册损害其姓名权；对具有较高知名度的自然人姓名，相关公众易于将其与特定主体建立联系，应予以保护，判决撤销相关商标的注册。典型意义：确立了外国人姓名权在中国商标行政案件中受保护的标准及\"稳定对应关系\"的认定规则（最高人民法院（2016）最高法行再34号等，供学习参考）。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-case-tm-3",
    "title": "【案例】\"红罐王老吉\"包装装潢案",
    "category": "商标法",
    "kind": "case",
    "enabled": false,
    "content": "基本案情：广药集团与加多宝公司就\"红罐凉茶\"知名商品特有包装装潢权益归属发生争议。争议焦点：红罐包装装潢权益应归商标权人（广药）还是实际长期使用者（加多宝），以及能否\"红罐\"与\"王老吉\"分属。裁判要旨：最高人民法院认为，包装装潢权益依托于\"王老吉\"知名商品，商标许可终止后，该特有包装装潢归广药集团所有；但同时考量双方对品牌培育的贡献，引导当事人本着诚实信用原则协商解决。典型意义：厘清了注册商标与知名商品特有包装装潢的关系及权益归属（最高人民法院（2015）民提字第161号，供学习参考）。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-case-pat-1",
    "title": "【案例】华为诉三星标准必要专利案",
    "category": "专利法",
    "kind": "case",
    "enabled": false,
    "content": "基本案情：华为技术有限公司以三星旗下多家公司侵犯其4G标准必要专利（SEP）为由，在深圳中院、深圳知识产权法庭等提起诉讼，请求停止侵权并赔偿。争议焦点：被诉产品是否落入专利保护范围、标准必要专利权人是否违反FRAND（公平、合理、无歧视）许可义务。裁判要旨：法院认定三星构成侵权，判令停止侵害并赔偿经济损失；在标准必要专利案件中，法院同时审查双方就FRAND费率协商的诚信情况。典型意义：我国法院在标准必要专利全球博弈中确立管辖权与裁判规则，体现对通信领域知识产权强保护导向（供学习参考）。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-case-cr-1",
    "title": "【案例】\"大头儿子\"美术作品著作权案",
    "category": "著作权法",
    "kind": "case",
    "enabled": false,
    "content": "基本案情：刘某创作\"大头儿子\"\"小头爸爸\"\"围裙妈妈\"三个动画人物形象美术作品，央视及其关联公司后续开发动画并使用该形象；杭州大头儿子文化发展有限公司受让取得相关权利后，主张央视动画有限公司等未经许可使用构成侵权。争议焦点：人物形象美术作品的著作权归属、演绎使用是否构成侵权。裁判要旨：法院认定原始美术作品著作权归创作者，受让人取得的权利不得超越原权利范围；被诉方超出授权范围使用构成侵权，应承担赔偿等责任。典型意义：明确了委托/职务创作中美术作品权属及后续商业化使用的边界（供学习参考）。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-case-uc-1",
    "title": "【案例】\"香兰素\"技术秘密侵权案",
    "category": "反不正当竞争法",
    "kind": "case",
    "enabled": false,
    "content": "基本案情：嘉兴市中华化工有限责任公司、上海欣晨新技术有限公司主张王某龙、宁波王龙科技股份有限公司等以不正当手段获取并使用其\"香兰素\"生产工艺技术秘密。争议焦点：涉案信息是否构成商业秘密（秘密性、价值性、保密措施）、侵权人获利及赔偿数额。裁判要旨：最高人民法院认定涉案工艺信息构成商业秘密，侵权人恶意实施侵犯商业秘密行为且情节严重，判决侵权人连带赔偿权利人经济损失及合理开支合计约1.59亿元；明确了在权利人损失、侵权人获利均可以查明时，依此确定赔偿、并在情节严重时依法适用惩罚性考量。典型意义：体现对商业秘密的强保护及高额判赔导向，是技术秘密维权标志性案件（最高人民法院（2020）最高法知民终1667号，供学习参考）。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-guide-overview",
    "title": "《商标审查审理指南》概述（体系与生效）",
    "category": "商标法",
    "kind": "law",
    "enabled": false,
    "content": "国家知识产权局于2021年发布（公告第462号），自2022年1月1日起施行，原《商标审查及审理标准》同时废止。全文分为上编“形式审查和事务工作编”（共25章，涵盖申请形式审查、商品服务与检索要素分类、马德里商标国际注册、申请事务处理等）与下编“商标审查审理编”（共19章，商标授权确权实体审查标准）。下编核心章节包括：概述、不以使用为目的的恶意注册、不得作为商标标志、显著特征、相同近似、三维/颜色组合/声音商标、集体证明商标、驰名商标、在先权利与抢注、撤销、审查意见书等。本工具以下条目对下编要点做提炼，供学习参考。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-guide-malicious",
    "title": "审查审理指南：不以使用为目的的恶意商标注册申请（下编第二章·商标法第四条）",
    "category": "商标法",
    "kind": "law",
    "enabled": false,
    "content": "释义：申请人并非基于生产经营活动的需要，而提交大量商标注册申请，缺乏真实使用意图，不正当占用商标资源，扰乱商标注册秩序的行为。考量因素：申请人基本情况（申请数量、指定类别、商标交易情况、所在行业与经营状况）及申请整体情况；注册审查以发现的线索为主，异议、评审程序以在案证据为主。9种典型情形（要点）：大量申请囤积、多次跨类抢注他人商标、抢注知名人物姓名或企业字号、同一主体反复申请已具知名度商标扰乱秩序等。例外肯认：基于防御目的申请与已注册商标相同/近似的商标、为具有现实预期的未来业务预先适量申请。特别明确：串通合谋或具有特定身份关系人申请的商标、以及商标转让，均不影响对“不以使用为目的”的认定。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-guide-prohibited",
    "title": "审查审理指南：不得作为商标标志的审查审理（下编第三章·商标法第十条）",
    "category": "商标法",
    "kind": "law",
    "enabled": false,
    "content": "商标法第十条为绝对禁用条款，相关标志既不得注册也不得使用，主要包括：同中华人民共和国国家名称、国旗、国徽、国歌、军旗、军徽、军歌、勋章等相同或者近似的；同外国国家名称、国旗、国徽等相同或者近似的（但经该国政府同意的除外）；同政府间国际组织的名称、旗帜、徽记等相同或者近似的（但经该组织同意或不易误导公众的除外）；与表明实施控制、予以保证的官方标志、检验印记相同或者近似的；同“红十字”“红新月”的名称、标志相同或者近似的；带有民族歧视性的；带有欺骗性、容易使公众对商品的质量等特点或者产地产生误认的；有害于社会主义道德风尚或者有其他不良影响的。县级以上行政区划的地名或公众知晓的外国地名一般不得作为商标，但地名具有其他含义或作为集体/证明商标组成部分的除外；注册商标专用权人无权禁止他人正当使用地名。指南区分了含国家名称等与其他要素组合时的不同款项适用。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-guide-distinctiveness",
    "title": "审查审理指南：商标显著特征的审查审理（下编第四章·商标法第十一、十二条）",
    "category": "商标法",
    "kind": "law",
    "enabled": false,
    "content": "商标法第十一条：下列标志不得作为商标注册——(一)仅有本商品的通用名称、图形、型号的；(二)仅直接表示商品的质量、主要原料、功能、用途、重量、数量及其他特点的；(三)其他缺乏显著特征的。前款所列标志经过使用取得显著特征，并便于识别的（即“第二含义”），可以作为商标注册。商标法第十二条：以三维标志申请注册商标，仅由商品自身的性质产生的形状、为获得技术效果而需有的商品形状、或者使商品具有实质性价值的形状，不得注册。显著特征分为固有显著性（臆造词、任意词等先天可区分）与获得显著性（经长期使用使相关公众建立稳定来源联系）。审查时综合标志本身含义/呼叫/外观、指定商品、相关公众认知习惯与行业实际使用情况判断。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-guide-similarity",
    "title": "审查审理指南：商标相同、近似的审查审理（下编第五章）",
    "category": "商标法",
    "kind": "law",
    "enabled": false,
    "content": "相同商标：两商标在视觉或听觉感知上完全相同或基本无差别。文字商标相同指文字完全一致或仅在字体、大小写、文字排列（横排/竖排）、间距、颜色上存在细微差别；图形商标相同指构图要素、表现形式等视觉上基本无差别；组合商标相同指文字、图形及其排列组合基本一致。混淆是商标相同的结果而非判断要件。近似商标：商标在字形、读音、含义、构图、颜色、整体结构或立体形状上相似，容易导致相关公众对商品来源产生混淆。判断原则：以相关公众的一般注意力和认知力为标准；采用隔离观察、整体比对和主要部分比对的方法。文字近似从形、音、意三个维度判断；图形近似看外观/构图接近或包含他人具有较高知名度的图形商标；组合商标综合文字与图形规则判断，整体外观区别明显且不易混淆的不判近似。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-guide-wellknown",
    "title": "审查审理指南：复制、摹仿或者翻译他人驰名商标的审查审理（下编第十章·商标法第十三条）",
    "category": "商标法",
    "kind": "law",
    "enabled": false,
    "content": "未在中国注册的驰名商标：就相同或者类似商品申请注册的商标是复制、摹仿或者翻译他人未注册驰名商标，容易导致混淆的，不予注册并禁止使用。已在中国注册的驰名商标：就不相同或者不相类似商品申请注册的商标是复制、摹仿或者翻译他人已注册驰名商标，误导公众，致使该驰名商标注册人的利益可能受到损害的，不予注册并禁止使用。驰名商标认定遵循“按需认定、被动保护”原则，个案认定、被动触发，不采“主动、普遍”认定。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-guide-prior-right",
    "title": "审查审理指南：损害在先权利与抢注有一定影响商标（下编第十四、十五章·商标法第三十二、十五条）",
    "category": "商标法",
    "kind": "law",
    "enabled": false,
    "content": "商标法第三十二条：申请商标注册不得损害他人现有的在先权利，也不得以不正当手段抢先注册他人已经使用并有一定影响的商标。在先权利包括著作权、外观设计专利权、姓名权、肖像权、企业名称权、知名商品特有名称/包装/装潢权益等；抢注“有一定影响”商标强调商标已使用并具有一定影响、申请人采取不正当手段。商标法第十五条：代理人或代表人未经授权以自己的名义将被代理人或被代表人的商标进行注册，不予注册并禁止使用；就同一种商品或者类似商品，合同、业务往来等关系明知他人在先使用的商标而抢注的，亦不予注册。商标法第十三条第四款（代理/代表关系外）及第十九条第四款：商标代理机构除对其代理服务申请注册商标外，不得申请注册其他商标。",
    "builtin": true,
    "legacyReference": true
  },
  {
    "id": "seed-guide-cancel",
    "title": "审查审理指南：撤销注册商标与审查意见书（下编第十七、十九章·商标法第四十九条）",
    "category": "商标法",
    "kind": "law",
    "enabled": false,
    "content": "连续三年不使用撤销（撤三）：注册商标没有正当理由连续三年不使用的，任何单位或者个人可以向商标局申请撤销该注册商标；撤销程序中注册人应当提交期间内的使用证据。成为通用名称撤销：注册商标成为其核定使用商品的通用名称的，可申请撤销。审查意见书：审查中认为申请违反规定、可要求申请人限期说明的，商标局可以发出审查意见书。程序衔接：注册申请被驳回→十五日内申请复审→对复审不服可起诉；初步审定公告期内异议→不予注册或核准；已注册商标可因绝对理由（禁用/缺乏显著/欺骗等）或相对理由（冲突/抢注/在先权利）请求无效宣告；连续三年不使用或成为通用名称可请求撤销。",
    "builtin": true,
    "legacyReference": true
  }
]
$catalog$::jsonb) WITH ORDINALITY AS source(item,n)
ON CONFLICT (id) DO NOTHING;
COMMIT;
