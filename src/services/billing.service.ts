export class BillingService {
    /**
     * Calculates monthly fee based on interval.
     * 1 min = 50,000 KRW
     * 10 min = 10,000 KRW
     * Linear scaling logic: y = -4444.44x + 54444.44 (approx)
     * Or simpler: [1=50k, 2=45k, ..., 10=10k] -> 50000 - (interval - 1) * 4444.44
     * Let's use a fixed map for precision.
     */
    private static readonly PRICE_MAP: Record<number, number> = {
        1: 29800,
        3: 19800,
        5: 9900
    };

    static getMonthlyPrice(interval: number): number {
        return this.PRICE_MAP[interval] || 9900;
    }

    /**
     * Calculate pro-rata adjustment when changing interval.
     * Remaining days in current cycle * (new_price - old_price) / total_days
     */
    static calculateProRata(
        oldInterval: number,
        newInterval: number,
        daysRemaining: number,
        totalDays: number
    ): number {
        const oldPrice = this.getMonthlyPrice(oldInterval);
        const newPrice = this.getMonthlyPrice(newInterval);

        const diff = newPrice - oldPrice;
        return Math.floor((diff * daysRemaining) / totalDays);
    }
}
