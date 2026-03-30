import React from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    tempApiKey: string;
    tempClientId: string;
    tempAiApiKey: string;
    tempAiProjectId: string;
    tempAiModel: string;
    showApiKey: boolean;
    showAiApiKey: boolean;
    onClose: () => void;
    onToggleShowApiKey: () => void;
    onToggleShowAiApiKey: () => void;
    onTempApiKeyChange: (value: string) => void;
    onTempClientIdChange: (value: string) => void;
    onTempAiApiKeyChange: (value: string) => void;
    onTempAiProjectIdChange: (value: string) => void;
    onTempAiModelChange: (value: string) => void;
    onSave: () => void;
    onClearCredentials: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    tempApiKey,
    tempClientId,
    tempAiApiKey,
    tempAiProjectId,
    tempAiModel,
    showApiKey,
    showAiApiKey,
    onClose,
    onToggleShowApiKey,
    onToggleShowAiApiKey,
    onTempApiKeyChange,
    onTempClientIdChange,
    onTempAiApiKeyChange,
    onTempAiProjectIdChange,
    onTempAiModelChange,
    onSave,
    onClearCredentials,
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content settings-modal"
                onClick={event => event.stopPropagation()}
            >
                <div className="modal-header">
                    <div className="modal-title">⚙️ Configuración de Google API</div>
                    <button onClick={onClose} className="modal-close">&times;</button>
                </div>
                <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>💡 Opcional:</strong> Configure su propia API Key para usar el selector visual de Drive. Sin API Key, se usará un selector simple.
                </div>
                <div>
                    <div className="lbl">Google API Key (opcional)</div>
                    <div className="flex gap-2">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            className="inp flex-grow"
                            value={tempApiKey}
                            onChange={e => onTempApiKeyChange(e.target.value)}
                            placeholder="AIzaSy..."
                        />
                        <button className="btn" style={{ padding: '6px' }} onClick={onToggleShowApiKey}>
                            {showApiKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <small className="text-xs text-gray-500">
                        Obtén tu API Key en{' '}
                        <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                        >
                            Google Cloud Console
                        </a>
                    </small>
                </div>
                <div>
                    <div className="lbl">Client ID (opcional)</div>
                    <input
                        type="text"
                        className="inp"
                        value={tempClientId}
                        onChange={e => onTempClientIdChange(e.target.value)}
                        placeholder="123-abc.apps.googleusercontent.com"
                    />
                </div>
                <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>🤖 Asistente IA:</strong> Ingrese una clave de Gemini para habilitar las herramientas de redacción inteligente en el editor avanzado.
                </div>
                <div>
                    <div className="lbl">Gemini API Key</div>
                    <div className="flex gap-2">
                        <input
                            type={showAiApiKey ? 'text' : 'password'}
                            className="inp flex-grow"
                            value={tempAiApiKey}
                            onChange={e => onTempAiApiKeyChange(e.target.value)}
                            placeholder="AIza..."
                        />
                        <button className="btn" style={{ padding: '6px' }} onClick={onToggleShowAiApiKey}>
                            {showAiApiKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <small className="text-xs text-gray-500">
                        Necesitas acceso a{' '}
                        <a
                            href="https://ai.google.dev/gemini-api/docs/api-key"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                        >
                            una Gemini API Key
                        </a>{' '}
                        para usar las herramientas de IA directamente desde el navegador.
                    </small>
                </div>
                <div>
                    <div className="lbl">Proyecto de Google Cloud para Gemini (opcional)</div>
                    <input
                        type="text"
                        className="inp"
                        value={tempAiProjectId}
                        onChange={e => onTempAiProjectIdChange(e.target.value)}
                        placeholder="1056053283940"
                    />
                    <small className="text-xs text-gray-500">
                        Si tu clave proviene de Google Cloud Console, indica aquí el <strong>número del proyecto</strong> para que
                        la app envíe el encabezado <code>X-Goog-User-Project</code> requerido por la cuota facturable. Tu cuenta
                        debe tener el rol <code>serviceusage.serviceUsageConsumer</code>; si no lo tienes, deja este campo vacío.
                    </small>
                </div>
                <div>
                    <div className="lbl">Modelo de Gemini (opcional)</div>
                    <input
                        type="text"
                        className="inp"
                        value={tempAiModel}
                        onChange={e => onTempAiModelChange(e.target.value)}
                        placeholder="gemini-1.5-flash-latest"
                    />
                    <small className="text-xs text-gray-500">
                        Déjalo en blanco para usar el modelo recomendado (<code>gemini-1.5-flash-latest</code>). Si tu clave no tiene acceso lo cambiaremos automáticamente al primer modelo general disponible en tu catálogo. También puedes ingresar otros modelos compatibles (p. ej., <code>gemini-pro</code>); comprobaremos si están en <code>v1</code> o <code>v1beta</code> y probaremos ambos antes del primer uso. Si necesitas forzar una versión específica, agrega <code>@v1</code> o <code>@v1beta</code> al final.
                    </small>
                </div>
                <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>⚠️ Privacidad:</strong> Las API keys sensibles se guardan solo durante la sesión activa del navegador. El proyecto, modelo y client ID sí pueden persistirse localmente. Nunca se envían a ningún servidor externo.
                </div>
                <div className="modal-footer">
                    <button onClick={onClearCredentials} className="btn bg-red-600 hover:bg-red-700 text-white">
                        🗑️ Eliminar credenciales
                    </button>
                    <div className="flex gap-2">
                        <button className="btn" onClick={onClose}>Cancelar</button>
                        <button onClick={onSave} className="btn btn-primary">💾 Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
