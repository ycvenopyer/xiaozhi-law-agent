interface PresetModel {
  id: string;
  label: string;
  vision?: boolean;
}

interface ModelGroup {
  label: string;
  models: PresetModel[];
}

export interface ModelPreset {
  name: string;
  url: string;
  docs: string;
  defaultModel: PresetModel;
  groups: ModelGroup[];
}

function model(id: string, label: string, vision?: true): PresetModel {
  return { id, label, vision };
}

function preset(name: string, url: string, docs: string, defaultId: string, ...groups: ModelGroup[]): ModelPreset {
  const defaultModel = groups.flatMap(group => group.models).find(entry => entry.id === defaultId);
  if (!defaultModel) throw new Error('Missing preset model: ' + defaultId);
  return { name, url, docs, defaultModel, groups };
}

export function findPresetModel(provider: ModelPreset | undefined, id: string) {
  return provider?.groups.flatMap(group => group.models).find(entry => entry.id === id);
}

export const modelPresets = [
  preset('智谱 AI', 'https://open.bigmodel.cn/api/paas/v4', 'https://docs.bigmodel.cn/cn/guide/start/pricing', 'glm-4.7-flash', {
    label: 'GLM 5 系列',
    models: [
      model('glm-5.3', 'GLM-5.3'),
      model('glm-5.3-flash', 'GLM-5.3-Flash', true),
      model('glm-5.2', 'GLM-5.2'),
      model('glm-5.1', 'GLM-5.1'),
      model('glm-5', 'GLM-5'),
      model('glm-5-turbo', 'GLM-5-Turbo'),
      model('glm-5v-turbo', 'GLM-5V-Turbo', true),
    ],
  }, {
    label: 'GLM 4 系列',
    models: [
      model('glm-4.7', 'GLM-4.7'),
      model('glm-4.7-flash', 'GLM-4.7-Flash'),
      model('glm-4.6', 'GLM-4.6'),
      model('glm-4.6v', 'GLM-4.6V', true),
      model('glm-4.6v-flash', 'GLM-4.6V-Flash', true),
    ],
  }),
  preset('DeepSeek', 'https://api.deepseek.com', 'https://api-docs.deepseek.com/api/list-models', 'deepseek-flash', {
    label: 'DeepSeek V4',
    models: [
      model('deepseek-flash', 'DeepSeek-V4.1-Flash', true),
      model('deepseek-v4-pro', 'DeepSeek-V4-Pro'),
    ],
  }),
  preset('月之暗面', 'https://api.moonshot.cn/v1', 'https://platform.kimi.com/docs/models', 'kimi-k3.1-pro', {
    label: 'Kimi K3 系列',
    models: [
      model('kimi-k3.1-pro', 'Kimi K3.1 Pro', true),
      model('kimi-k3.1-pro-highspeed', 'Kimi K3.1 Pro Highspeed', true),
      model('kimi-k3', 'Kimi K3', true),
    ],
  }, {
    label: 'Kimi K2 系列（仅存量账号）',
    models: [
      model('kimi-k2.7-code', 'Kimi K2.7 Code'),
      model('kimi-k2.7-code-highspeed', 'Kimi K2.7 Code Highspeed'),
      model('kimi-k2.6', 'Kimi K2.6', true),
    ],
  }),
  preset('腾讯混元', 'https://tokenhub.tencentmaas.com/v1', 'https://cloud.tencent.com/document/product/1823/130079', 'hy4-flash', {
    label: '混元通用',
    models: [
      model('hy4', 'Hy4'),
      model('hy4-flash', 'Hy4 Flash'),
      model('hy3', 'Hy3'),
    ],
  }, {
    label: '混元翻译和角色',
    models: [
      model('hy-mt2-pro', 'Hy-MT2-Pro'),
      model('hy-mt2-plus', 'Hy-MT2-Plus'),
      model('hy-mt2-lite', 'Hy-MT2-Lite'),
      model('hunyuan-role-latest', 'Hy-Role-Latest'),
      model('hy-role', 'Hy-Role'),
    ],
  }),
  preset('阿里千问', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions', 'qwen-plus', {
    label: 'Max · 旗舰',
    models: [
      model('qwen4-max', 'Qwen4-Max', true),
      model('qwen3.8-max', 'Qwen3.8-Max', true),
      model('qwen3.8-max-0902', 'Qwen3.8-Max（0902 快照）', true),
      model('qwen3.7-max', 'Qwen3.7-Max'),
      model('qwen3.7-max-2026-06-08', 'Qwen3.7-Max（2026-06-08 快照）'),
      model('qwen-max', 'Qwen-Max'),
    ],
  }, {
    label: 'Plus · 均衡',
    models: [
      model('qwen3.7-plus', 'Qwen3.7-Plus', true),
      model('qwen3.7-plus-2026-05-26', 'Qwen3.7-Plus（2026-05-26 快照）', true),
      model('qwen3.6-plus', 'Qwen3.6-Plus', true),
      model('qwen3.5-plus', 'Qwen3.5-Plus', true),
      model('qwen-plus', 'Qwen-Plus'),
    ],
  }, {
    label: 'Flash · 快速',
    models: [
      model('qwen3.8-flash', 'Qwen3.8-Flash', true),
      model('qwen3.7-flash', 'Qwen3.7-Flash', true),
      model('qwen3.7-flash-2026-07-15', 'Qwen3.7-Flash（2026-07-15 快照）', true),
      model('qwen3.6-flash', 'Qwen3.6-Flash', true),
      model('qwen3.5-flash', 'Qwen3.5-Flash', true),
      model('qwen-flash', 'Qwen-Flash'),
    ],
  }, {
    label: 'Omni 与视觉',
    models: [
      model('qwen3.8-omni-flash', 'Qwen3.8-Omni-Flash', true),
      model('qwen3.5-omni-plus', 'Qwen3.5-Omni-Plus', true),
      model('qwen3.5-omni-flash', 'Qwen3.5-Omni-Flash', true),
      model('qwen3-vl-plus', 'Qwen3-VL-Plus', true),
      model('qwen3-vl-flash', 'Qwen3-VL-Flash', true),
    ],
  }, {
    label: '开源权重 · 百炼托管',
    models: [
      model('qwen3.8-2.4t-a95b', 'Qwen3.8-2.4T-A95B', true),
      model('qwen3.8-27b', 'Qwen3.8-27B', true),
      model('qwen3.6-35b-a3b', 'Qwen3.6-35B-A3B', true),
      model('qwen3.6-27b', 'Qwen3.6-27B', true),
      model('qwen3.5-122b-a10b', 'Qwen3.5-122B-A10B', true),
      model('qwen3.5-27b', 'Qwen3.5-27B', true),
    ],
  }, {
    label: '编程与长文',
    models: [
      model('qwen3-coder-flash', 'Qwen3-Coder-Flash'),
      model('qwen-long', 'Qwen-Long'),
    ],
  }),
  preset('小米 MiMo', 'https://api.xiaomimimo.com/v1', 'https://mimo.mi.com/docs/zh-CN/quick-start/summary/model', 'mimo-v2.6-flash', {
    label: 'MiMo V2.6',
    models: [
      model('mimo-v2.6-flash', 'MiMo-V2.6-Flash', true),
      model('mimo-v2.6-pro', 'MiMo-V2.6-Pro', true),
      model('mimo-v2.6-pro-ultraspeed', 'MiMo-V2.6-Pro-Ultraspeed', true),
    ],
  }),
  preset('阶跃星辰', 'https://api.stepfun.com/v1', 'https://platform.stepfun.ai/docs/en/guides/models/overview', 'step-3.5-flash', {
    label: 'Step Flash 系列',
    models: [
      model('step-3.7-flash', 'Step 3.7 Flash', true),
      model('step-3.5-flash', 'Step 3.5 Flash'),
    ],
  }),
];
