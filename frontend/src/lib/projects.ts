import type { Project, Session } from '@/types/agent';
import { loadCollection, saveCollection } from './cloud-store';

const PROJECTS_SETTING = 'sidebar-projects';

export function loadProjects(): Project[] {
  const record = loadCollection<{ id: string; projects?: Project[] }>('settings').find(item => item.id === PROJECTS_SETTING);
  if (!Array.isArray(record?.projects)) return [];
  const seen = new Set<string>();
  return record.projects.filter(project => {
    if (!project || typeof project.id !== 'string' || !project.id || typeof project.name !== 'string' || !project.name.trim() || seen.has(project.id)) return false;
    seen.add(project.id); return true;
  });
}

export function saveProjects(projects: Project[]) {
  // Keep other account settings (privacy, import markers, etc.) intact.
  void saveCollection('settings', [{ id: PROJECTS_SETTING, projects }], false).catch(() => { /* account sync status reports failures */ });
}

export function sortConversations(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    if (!!a.pinnedAt !== !!b.pinnedAt) return a.pinnedAt ? -1 : 1;
    return a.pinnedAt && b.pinnedAt ? b.pinnedAt - a.pinnedAt : b.updatedAt - a.updatedAt;
  });
}
