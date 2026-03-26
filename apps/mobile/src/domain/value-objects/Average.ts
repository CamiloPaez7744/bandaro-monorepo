export class Average {
    static calcular(totalCarambolas: number, totalEntrys: number): number {
        if (totalEntrys <= 0) {
            return 0;
        }

        return Number((totalCarambolas / totalEntrys).toFixed(3));
    }
}
