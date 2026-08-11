import { CreateMatch } from '@/src/application/usecases/CreateMatch';
import { FinishMatch } from '@/src/application/usecases/FinishMatch';
import { GetStatistics } from '@/src/application/usecases/GetStatistics';
import { GetHistory } from '@/src/application/usecases/GetHistory';
import { GetMatch } from '@/src/application/usecases/GetMatch';
import { RegisterEntry } from '@/src/application/usecases/RegisterEntry';
import { UndoLastEntry } from '@/src/application/usecases/UndoLastEntry';
import { SubmitTableSnapshot } from '@/src/application/usecases/SubmitTableSnapshot';
import { RegisterUser } from '@/src/application/usecases/RegisterUser';
import { LoginUser } from '@/src/application/usecases/LoginUser';
import { RefreshSession } from '@/src/application/usecases/RefreshSession';
import { GetCurrentSession } from '@/src/application/usecases/GetCurrentSession';
import { LogoutUser } from '@/src/application/usecases/LogoutUser';
import { GetUserById } from '@/src/application/usecases/GetUserById';
import { UpdateUserProfile } from '@/src/application/usecases/UpdateUserProfile';
import { FileSystemMatchRepository } from '@/src/infrastructure/repositories/FileSystemMatchRepository';
import { FileSystemAuthRepository } from '@/src/infrastructure/repositories/FileSystemAuthRepository';
import { ApiSnapshotRepository } from '@/src/infrastructure/repositories/ApiSnapshotRepository';

const repository = new FileSystemMatchRepository();
const authRepository = new FileSystemAuthRepository();
const snapshotRepository = new ApiSnapshotRepository();

export const container = {
    crearMatch: new CreateMatch(repository),
    registrarEntry: new RegisterEntry(repository),
    deshacerUltimaEntry: new UndoLastEntry(repository),
    finalizarMatch: new FinishMatch(repository),
    obtenerHistory: new GetHistory(repository),
    obtenerMatch: new GetMatch(repository),
    obtenerStatistics: new GetStatistics(repository),
    submitTableSnapshot: new SubmitTableSnapshot(snapshotRepository),
    registerUser: new RegisterUser(authRepository),
    loginUser: new LoginUser(authRepository),
    refreshSession: new RefreshSession(authRepository),
    getCurrentSession: new GetCurrentSession(authRepository),
    logoutUser: new LogoutUser(authRepository),
    getUserById: new GetUserById(authRepository),
    updateUserProfile: new UpdateUserProfile(authRepository),
};
