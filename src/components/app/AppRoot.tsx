import React, { Suspense, lazy, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { DEFAULT_GOOGLE_CLIENT_ID } from '../../appConstants';
import { useToast } from '../../hooks/useToast';
import { AuthProvider } from '../../contexts/AuthContext';
import { DriveProvider } from '../../contexts/DriveContext';
import { RecordProvider } from '../../contexts/RecordContext';
import { ErrorBoundary } from '../ErrorBoundary';
import AppShellRoute from './AppShellRoute';

const CartolaMedicamentosView = lazy(() => import('../CartolaMedicamentosView'));

const AppRoot: React.FC = () => {
    const [clientId, setClientId] = useState(DEFAULT_GOOGLE_CLIENT_ID);
    const { toast, showToast } = useToast();
    const navigate = useNavigate();

    return (
        <AuthProvider clientId={clientId} showToast={showToast}>
            <DriveProvider showToast={showToast}>
                <RecordProvider showToast={showToast}>
                    <ErrorBoundary>
                        <Routes>
                            <Route
                                path="/"
                                element={(
                                    <AppShellRoute
                                        toast={toast}
                                        showToast={showToast}
                                        clientId={clientId}
                                        setClientId={setClientId}
                                        onOpenCartola={() => navigate('/cartola')}
                                    />
                                )}
                            />
                            <Route
                                path="/cartola"
                                element={(
                                    <Suspense fallback={<div className="p-4 text-sm text-gray-600">Cargando cartola de medicamentos…</div>}>
                                        <CartolaMedicamentosView onBack={() => navigate('/')} />
                                    </Suspense>
                                )}
                            />
                        </Routes>
                    </ErrorBoundary>
                </RecordProvider>
            </DriveProvider>
        </AuthProvider>
    );
};

export default AppRoot;
