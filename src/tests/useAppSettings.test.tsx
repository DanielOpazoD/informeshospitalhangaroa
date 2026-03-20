import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_GOOGLE_CLIENT_ID, LOCAL_STORAGE_KEYS } from '../appConstants';
import { useAppSettings } from '../hooks/useAppSettings';
import { createMockStorage } from './testUtils';

describe('useAppSettings', () => {
    it('carga configuración persistida y guarda valores sanitizados', () => {
        const { storage, values } = createMockStorage();
        values.set(LOCAL_STORAGE_KEYS.googleClientId, 'saved-client');
        values.set(LOCAL_STORAGE_KEYS.geminiModel, 'gemini-2.0-flash@v1');
        Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
        const setClientId = vi.fn();
        const onToast = vi.fn();

        const { result } = renderHook(() => useAppSettings({
            clientId: DEFAULT_GOOGLE_CLIENT_ID,
            setClientId,
            envGeminiApiKey: '',
            envGeminiProjectId: '',
            initialGeminiModel: 'gemini-1.5-flash-latest',
            confirmClearSettings: async () => true,
            onToast,
        }));

        act(() => {
            result.current.openSettingsModal();
        });

        act(() => {
            result.current.setTempApiKey(' api-key ');
            result.current.setTempClientId(' client-123 ');
            result.current.setTempAiApiKey(' ai-key ');
            result.current.setTempAiProjectId(' 321 ');
            result.current.setTempAiModel(' gemini-2.0-flash @v1beta ');
        });

        act(() => {
            result.current.saveSettings();
        });

        expect(setClientId).toHaveBeenCalledWith('saved-client');
        expect(result.current.apiKey).toBe('api-key');
        expect(result.current.aiApiKey).toBe('ai-key');
        expect(result.current.aiProjectId).toBe('321');
        expect(result.current.aiModel).toBe('gemini-2.0-flash@v1beta');
        expect(onToast).toHaveBeenCalled();
    });

    it('limpia credenciales cuando se confirma la acción', async () => {
        const { storage } = createMockStorage();
        Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
        const setClientId = vi.fn();
        const onToast = vi.fn();

        const { result } = renderHook(() => useAppSettings({
            clientId: DEFAULT_GOOGLE_CLIENT_ID,
            setClientId,
            envGeminiApiKey: '',
            envGeminiProjectId: '',
            initialGeminiModel: 'gemini-1.5-flash-latest',
            confirmClearSettings: async () => true,
            onToast,
        }));

        await act(async () => {
            await result.current.clearSettings();
        });

        expect(setClientId).toHaveBeenCalledWith(DEFAULT_GOOGLE_CLIENT_ID);
        expect(result.current.aiModel).toBe('gemini-1.5-flash-latest');
        expect(onToast).toHaveBeenCalledWith(
            'Credenciales eliminadas. Recargue la página para aplicar los cambios.',
            'warning',
        );
    });
});
