import { useEffect, useState } from 'react';
import type { HhrCensusPatient } from '../hhrTypes';
import { isHhrFirebaseConfigured, subscribeToHospitalCensus } from '../services/hhrFirebaseService';

interface UseHospitalCensusOptions {
    enabled: boolean;
    dateKey: string;
}

export const useHospitalCensus = ({ enabled, dateKey }: UseHospitalCensusOptions) => {
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

        const unsubscribe = subscribeToHospitalCensus(
            dateKey,
            nextPatients => {
                setPatients(nextPatients);
                setIsLoading(false);
            },
            nextError => {
                setError(nextError.message || 'No fue posible leer el censo de HHR.');
                setPatients([]);
                setIsLoading(false);
            }
        );

        return unsubscribe;
    }, [dateKey, enabled]);

    return {
        patients,
        isLoading,
        error,
    };
};
