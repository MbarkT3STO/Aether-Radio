import { ok, err, appError } from '../../Result';
export class ClearHistoryUseCase {
    constructor(historyRepo) {
        Object.defineProperty(this, "historyRepo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: historyRepo
        });
    }
    async execute() {
        try {
            await this.historyRepo.clear();
            return ok(undefined);
        }
        catch (e) {
            return err(appError('CLEAR_HISTORY_FAILED', 'Failed to clear history', e));
        }
    }
}
