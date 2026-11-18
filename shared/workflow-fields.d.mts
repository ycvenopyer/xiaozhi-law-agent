export type WorkflowMode = 'compare' | 'infringement' | 'compliance' | 'draft'
export interface WorkflowPrefill { task: string; values: Record<string, string> }

export const choices: Record<WorkflowMode, string[]>
export function fieldNames(mode: WorkflowMode, task: string): string[]
