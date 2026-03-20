import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../components/ErrorBoundary';

const ThrowingChild = ({ message = 'boom' }: { message?: string }) => {
    throw new Error(message);
};

describe('ErrorBoundary', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renderiza el fallback customizado cuando existe', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ErrorBoundary fallback={<div>fallback personalizado</div>}>
                <ThrowingChild />
            </ErrorBoundary>
        );

        expect(screen.getByText('fallback personalizado')).toBeTruthy();
    });

    it('renderiza el fallback por defecto con el error visible', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ErrorBoundary>
                <ThrowingChild message="fallo crítico" />
            </ErrorBoundary>
        );

        expect(screen.getByText('Algo salió mal')).toBeTruthy();
        expect(screen.getByText('fallo crítico')).toBeTruthy();
        expect(screen.getByText('Recargar la página')).toBeTruthy();
    });
});
