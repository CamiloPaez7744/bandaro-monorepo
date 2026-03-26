export class HighestRun {
    static calcular(series: number[]): number {
        if (series.length === 0) {
            return 0;
        }

        return Math.max(...series);
    }
}
