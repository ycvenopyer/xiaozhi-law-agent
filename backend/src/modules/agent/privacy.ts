import { AppError } from '../../middleware/errorHandler';
import { getRecord } from '../cloudbase';
export async function requireModelConsent(token: string) {
  const preferences = await getRecord(token, 'settings', 'privacy');
  if (preferences?.payload.externalModels !== true) {
    throw new AppError(403, '当前为禁止外发模式。请先在账号与隐私中明确允许第三方模型处理，再发起分析。');
  }
}
