import { CrearPartida } from '@/src/application/usecases/CrearPartida';
import { FinalizarPartida } from '@/src/application/usecases/FinalizarPartida';
import { ObtenerEstadisticas } from '@/src/application/usecases/ObtenerEstadisticas';
import { ObtenerHistorial } from '@/src/application/usecases/ObtenerHistorial';
import { ObtenerPartida } from '@/src/application/usecases/ObtenerPartida';
import { RegistrarEntrada } from '@/src/application/usecases/RegistrarEntrada';
import { DeshacerUltimaEntrada } from '@/src/application/usecases/DeshacerUltimaEntrada';
import { RegisterUser } from '@/src/application/usecases/RegisterUser';
import { LoginUser } from '@/src/application/usecases/LoginUser';
import { RefreshSession } from '@/src/application/usecases/RefreshSession';
import { GetCurrentSession } from '@/src/application/usecases/GetCurrentSession';
import { LogoutUser } from '@/src/application/usecases/LogoutUser';
import { GetUserById } from '@/src/application/usecases/GetUserById';
import { UpdateUserProfile } from '@/src/application/usecases/UpdateUserProfile';
import { FileSystemPartidaRepository } from '@/src/infrastructure/repositories/FileSystemPartidaRepository';
import { FileSystemAuthRepository } from '@/src/infrastructure/repositories/FileSystemAuthRepository';

const repository = new FileSystemPartidaRepository();
const authRepository = new FileSystemAuthRepository();

export const container = {
    crearPartida: new CrearPartida(repository),
    registrarEntrada: new RegistrarEntrada(repository),
    deshacerUltimaEntrada: new DeshacerUltimaEntrada(repository),
    finalizarPartida: new FinalizarPartida(repository),
    obtenerHistorial: new ObtenerHistorial(repository),
    obtenerPartida: new ObtenerPartida(repository),
    obtenerEstadisticas: new ObtenerEstadisticas(repository),
    registerUser: new RegisterUser(authRepository),
    loginUser: new LoginUser(authRepository),
    refreshSession: new RefreshSession(authRepository),
    getCurrentSession: new GetCurrentSession(authRepository),
    logoutUser: new LogoutUser(authRepository),
    getUserById: new GetUserById(authRepository),
    updateUserProfile: new UpdateUserProfile(authRepository),
};
