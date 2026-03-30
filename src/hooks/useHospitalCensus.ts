import { useEffect, useState } from 'react';
import type { HhrCensusPatient } from '../hhrTypes';
import type { HhrGateway } from '../infrastructure/hhr/hhrGateway';
import { isHhrFirebaseConfigured } from '../infrastructure/hhr/hhrConfig';

interface UseHospitalCensusOptions {
    enabled: boolean;
    dateKey: string;
    gateway: HhrGateway;
}

export const useHospitalCensus = ({ enabled, dateKey, gateway }: UseHospitalCensusOptions) => {
    const [patients, setPatients] = useState<HhrCensusPatient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled || !isHhrFirebaseConfigured()) {
            setPatients([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        const previousDate = new Date(`${dateKey}T00:00:00`);
        previousDate.setDate(previousDate.getDate() - 1);
        const previousDateKey = [
            previousDate.getFullYear(),
            String(previousDate.getMonth() + 1).padStart(2, '0'),
            String(previousDate.getDate()).padStart(2, '0'),
        ].join('-');

        let todaySnapshot: { exists: boolean; patients: HhrCensusPatient[] } | null = null;
        let previousSnapshot: { exists: boolean; patients: HhrCensusPatient[] } | null = null;

        const resolvePatients = () => {
            if (todaySnapshot?.exists) {
                setPatients(todaySnapshot.patients);
            } else if (previousSnapshot?.exists) {
                setPatients(previousSnapshot.patients);
            } else {
                setPatients([]);
            }
            setIsLoading(false);
        };

        const handleError = (nextError: Error) => {
            setError(nextError.message || 'No fue posible leer el censo de HHR.');
            setPatients([]);
            setIsLoading(false);
        };

        const unsubscribeToday = gateway.subscribeCensus(
            dateKey,
            snapshot => {
                todaySnapshot = { exists: snapshot.exists, patients: snapshot.patients };
                resolvePatients();
            },
            handleError,
        );

        const unsubscribePrevious = gateway.subscribeCensus(
            previousDateKey,
            snapshot => {
                previousSnapshot = { exists: snapshot.exists, patients: snapshot.patients };
                resolvePatients();
            },
            handleError,
        );

        return () => {
            unsubscribeToday();
            unsubscribePrevious();
        };
    }, [dateKey, enabled, gateway]);

    return {
        patients,
        isLoading,
        error,
    };
};
