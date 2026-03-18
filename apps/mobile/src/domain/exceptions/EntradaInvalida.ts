export class EntradaInvalida extends Error {
    constructor() {
        super('La entrada no es valida para la partida actual.');
        this.name = 'EntradaInvalida';
    }
}
