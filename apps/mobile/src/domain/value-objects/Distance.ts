export class Distance {
    static validar(valor: number): number {
        if (!Number.isInteger(valor) || valor < 5 || valor > 60) {
            throw new Error('La distancia debe ser un entero entre 5 y 60 carambolas.');
        }

        return valor;
    }
}
