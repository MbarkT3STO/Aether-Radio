import { ok, err, appError } from '../../Result';
export class AddToHistoryUseCase {
    constructor(historyRepo) {
        Object.defineProperty(this, "historyRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: historyRepo
        });
    }
    async execute(station) {
        try {
            const history = await this.historyRepo.add(station);
            return ok(history);
        }
        catch (e) {
            return err(appError('ADD_HISTORY_FAILED', 'Failed to add to history', e));
        }
    }
}
