export class MatchNotFound extends Error {
    constructor(id: string) {
        super(`No se encontro la partida con id ${id}`);
        this.name = 'MatchNotFound';
    }
}
