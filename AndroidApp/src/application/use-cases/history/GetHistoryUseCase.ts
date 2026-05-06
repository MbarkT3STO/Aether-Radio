import type { IHistoryRepository } from '../../../domain/repositories/IHistoryRepository'
import type { PlayHistory } from '../../../domain/entities/PlayHistory'
import { type Result, ok, err, appError } from '../../Result'

export class GetHistoryUseCase {
  constructor(private readonly historyRepo: IHistoryRepository) {}

  async execute(): Promise<Result<PlayHistory[]>> {
    try {
      const history = await this.historyRepo.getAll()
      return ok(history)
    } catch (e) {
      return err(appError('GET_HISTORY_FAILED', 'Failed to get history', e))
    }
  }
}
