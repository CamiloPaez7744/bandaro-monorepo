export class Promedio {
    static calcular(totalCarambolas: number, totalEntradas: number): number {
        if (totalEntradas <= 0) {
            return 0;
        }

        return Number((totalCarambolas / totalEntradas).toFixed(3));
    }
}
