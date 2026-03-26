export class InvalidEntry extends Error {
    constructor() {
        super('La entrada no es valida para la partida actual.');
        this.name = 'InvalidEntry';
    }
}
