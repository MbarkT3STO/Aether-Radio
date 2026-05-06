import { ok, err, appError } from '../../Result';
export class GetHistoryUseCase {
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
            const history = await this.historyRepo.getAll();
            return ok(history);
        }
        catch (e) {
            return err(appError('GET_HISTORY_FAILED', 'Failed to get history', e));
        }
    }
}
