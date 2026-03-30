import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Header from '../components/Header';

vi.mock('../components/UserAccountMenu', () => ({
    default: () => <div>user-account-menu</div>,
}));

// EditorToolbar was moved to AppWorkspace

const createProps = (): React.ComponentProps<typeof Header> => ({
    templateId: '2',
    onTemplateChange: vi.fn(),
    onAddClinicalUpdateSection: vi.fn(),
    onPrint: vi.fn(),
    onOpenSettings: vi.fn(),
    onRestoreTemplate: vi.fn(),
    onOpenCartolaApp: vi.fn(),
    auth: {
        isSignedIn: true,
        isGisReady: true,
        isGapiReady: true,
        isPickerApiReady: true,
        tokenClient: null,
        userProfile: null,
        onSignIn: vi.fn(),
        onSignOut: vi.fn(),
        onChangeUser: vi.fn(),
    },
    drive: {
        isSaving: false,
        hasApiKey: true,
        onSaveToDrive: vi.fn(),
        onOpenFromDrive: vi.fn(),
        onDownloadJson: vi.fn(),
    },
    editing: {
        isEditing: false,
        onToggleEdit: vi.fn(),
        isAdvancedEditing: true,
        onToggleAdvancedEditing: vi.fn(),
        isAiAssistantVisible: false,
        onToggleAiAssistant: vi.fn(),
        onToolbarCommand: vi.fn(),
    },
    save: {
        saveStatusLabel: 'Guardado local',
        lastSaveTime: 'Hace 1 min.',
        hasUnsavedChanges: true,
        canUndo: true,
        canRedo: true,
        onQuickSave: vi.fn(),
        onOpenHistory: vi.fn(),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
    },
});

describe('Header', () => {
    beforeEach(() => {
        const importButton = document.createElement('button');
        importButton.id = 'importJson';
        document.body.appendChild(importButton);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renderiza launcher, toolbar y menú de cuenta', () => {
        render(<Header {...createProps()} />);

        expect(screen.getByText('user-account-menu')).toBeTruthy();
        expect(screen.getByText('Guardado local')).toBeTruthy();
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('2');
    });

    it('dispara acciones principales desde launcher y barra superior', () => {
        const props = createProps();
        render(<Header {...props} />);

        fireEvent.click(screen.getByLabelText('Abrir aplicaciones'));
        fireEvent.click(screen.getByText('Cartola de medicamentos'));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } });
        fireEvent.click(screen.getByTitle('Agregar actualización clínica'));
        fireEvent.click(screen.getByTitle('Deshacer último cambio persistido'));
        fireEvent.click(screen.getByTitle('Rehacer cambio revertido'));
        fireEvent.click(screen.getByTitle('Desactivar edición avanzada'));
        fireEvent.click(screen.getByLabelText('Abrir asistente clínico'));

        expect(props.onOpenCartolaApp).toHaveBeenCalled();
        expect(props.onTemplateChange).toHaveBeenCalledWith('5');
        expect(props.onAddClinicalUpdateSection).toHaveBeenCalled();
        expect(props.save.onUndo).toHaveBeenCalled();
        expect(props.save.onRedo).toHaveBeenCalled();
        expect(props.editing.onToggleAdvancedEditing).toHaveBeenCalled();
        expect(props.editing.onToggleAiAssistant).toHaveBeenCalled();
    });

    it('ejecuta acciones de los menús Archivo y Drive desde el icono principal', () => {
        const props = createProps();
        const importClickSpy = vi.spyOn(document.getElementById('importJson') as HTMLButtonElement, 'click');
        render(<Header {...props} />);

        fireEvent.click(screen.getByLabelText('Archivo'));
        fireEvent.click(screen.getByText('Editar estructura'));
        fireEvent.click(screen.getByLabelText('Archivo'));
        fireEvent.click(screen.getByText('Guardar JSON'));
        fireEvent.click(screen.getByLabelText('Archivo'));
        fireEvent.click(screen.getByText('Importar JSON'));
        fireEvent.click(screen.getByTitle('Historial'));
        fireEvent.click(screen.getByLabelText('Archivo'));
        fireEvent.click(screen.getByTitle('Configuración de Google API'));

        fireEvent.click(screen.getByTitle('Imprimir PDF'));
        fireEvent.click(screen.getByTitle('Restablecer planilla'));

        fireEvent.click(screen.getByLabelText('Google Drive'));
        fireEvent.click(screen.getByText('Guardar en Drive'));
        fireEvent.click(screen.getByLabelText('Google Drive'));
        fireEvent.click(screen.getByText('Abrir desde Drive'));
        fireEvent.click(screen.getByLabelText('Google Drive'));
        fireEvent.click(screen.getByText('Cambiar usuario Drive'));
        fireEvent.click(screen.getByLabelText('Google Drive'));
        fireEvent.click(screen.getByText('Cerrar sesión Drive'));

        fireEvent.click(screen.getByTitle('Desactivar edición avanzada'));

        expect(props.editing.onToggleEdit).toHaveBeenCalled();
        expect(props.onPrint).toHaveBeenCalled();
        expect(props.drive.onDownloadJson).toHaveBeenCalled();
        expect(props.save.onOpenHistory).toHaveBeenCalled();
        expect(importClickSpy).toHaveBeenCalled();
        expect(props.onRestoreTemplate).toHaveBeenCalled();
        expect(props.drive.onSaveToDrive).toHaveBeenCalled();
        expect(props.drive.onOpenFromDrive).toHaveBeenCalled();
        expect(props.auth.onChangeUser).toHaveBeenCalled();
        expect(props.auth.onSignOut).toHaveBeenCalled();
        expect(props.onOpenSettings).toHaveBeenCalled();
    });

    it('muestra inicio de sesión dentro del menú de Drive cuando no hay sesión activa', () => {
        const props = createProps();
        props.auth.isSignedIn = false;
        props.auth.tokenClient = { requestAccessToken: vi.fn() };
        render(<Header {...props} />);

        fireEvent.click(screen.getByLabelText('Google Drive'));
        fireEvent.click(screen.getByText('Iniciar sesión en Drive'));

        expect(props.auth.onSignIn).toHaveBeenCalledOnce();
        expect(screen.queryByText('Guardar en Drive')).toBeNull();
    });
});
