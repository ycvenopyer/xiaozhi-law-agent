export { SKILL_CATALOG, findSkill } from '../../../shared/skill-catalog.generated';
export type { SkillId, SkillInfo } from '../../../shared/skill-catalog.generated';
import { authHeaders } from './cloudbase';

export interface PreparedSkill {
  id: string;
  name: string;
  version: string;
  prompt: string;
  resources: Array<{ path: string; description: string; load: string }>;
}

export async function prepareSkill(id: string, version: string, signal: AbortSignal): Promise<PreparedSkill> {
  const response = await fetch(`/api/agent/skills/${encodeURIComponent(id)}/prompt?version=${encodeURIComponent(version)}`, {
    headers: await authHeaders(), signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]), cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(response.status === 409 ? '技能已更新，请刷新页面后重新选择。' : '技能提示词加载失败，请重试。');
  }
  const skill = await response.json() as PreparedSkill;
  if (skill.id !== id || skill.version !== version || typeof skill.prompt !== 'string' || !skill.prompt.trim() || !Array.isArray(skill.resources)) {
    throw new Error('技能提示词格式异常，请刷新后重试。');
  }
  return skill;
}
