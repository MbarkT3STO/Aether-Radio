import type { IHistoryRepository } from '../../../domain/repositories/IHistoryRepository'
import { type Result, ok, err, appError } from '../../Result'

export class ClearHistoryUseCase {
  constructor(private readonly historyRepo: IHistoryRepository) {}

  async execute(): Promise<Result<void>> {
    try {
      await this.historyRepo.clear()
      return ok(undefined)
    } catch (e) {
      return err(appError('CLEAR_HISTORY_FAILED', 'Failed to clear history', e))
    }
  }
}
