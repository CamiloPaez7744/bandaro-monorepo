import React from 'react';
import { Stack } from 'expo-router';
import { TrainingSimulationScreen } from '@/src/presentation/screens/Training/TrainingSimulationScreen';

export default function SimulateRoute() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <TrainingSimulationScreen />
        </>
    );
}

