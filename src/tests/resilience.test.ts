import { describe, expect, it, vi } from 'vitest';
import { runWithResilience, withTimeout } from '../infrastructure/shared/resilience';

describe('resilience', () => {
    it('reintenta operaciones retryable y termina resolviendo', async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce('ok');

        const result = await runWithResilience(operation, {
            attempts: 2,
            timeoutMs: 100,
            label: 'Operación',
            shouldRetry: () => true,
            backoffMs: 0,
        });

        expect(result).toBe('ok');
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it('corta por timeout cuando la operación no responde', async () => {
        await expect(withTimeout(new Promise(() => {}), 10, 'Operación lenta')).rejects.toThrow('agotó el tiempo de espera');
    });
});
