import type { IHistoryRepository } from '../../../domain/repositories/IHistoryRepository'
import type { RadioStation } from '../../../domain/entities/RadioStation'
import type { PlayHistory } from '../../../domain/entities/PlayHistory'
import { type Result, ok, err, appError } from '../../Result'

export class AddToHistoryUseCase {
  constructor(private readonly historyRepo: IHistoryRepository) {}

  async execute(station: RadioStation): Promise<Result<PlayHistory>> {
    try {
      const history = await this.historyRepo.add(station)
      return ok(history)
    } catch (e) {
      return err(appError('ADD_HISTORY_FAILED', 'Failed to add to history', e))
    }
  }
}
