import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppWorkspace from '../../../components/app/AppWorkspace';

let headerProps: React.ComponentProps<typeof import('../../../components/Header').default> | null = null;
let patientInfoProps: React.ComponentProps<typeof import('../../../components/PatientInfo').default> | null = null;
const clinicalSectionProps: Array<React.ComponentProps<typeof import('../../../components/ClinicalSection').default>> = [];
let footerProps: React.ComponentProps<typeof import('../../../components/Footer').default> | null = null;

vi.mock('../../../components/Header', () => ({
    default: (props: React.ComponentProps<typeof import('../../../components/Header').default>) => {
        headerProps = props;
        return (
            <div>
                <button onClick={() => props.onTemplateChange('5')}>header-template</button>
                <button onClick={props.onAddClinicalUpdateSection}>header-add-update</button>
                <button onClick={props.onPrint}>header-print</button>
                <button onClick={props.onOpenSettings}>header-settings</button>
                <button onClick={props.onRestoreTemplate}>header-restore</button>
                <button onClick={props.onOpenCartolaApp}>header-cartola</button>
                <div>header</div>
            </div>
        );
    },
}));

vi.mock('../../../components/PatientInfo', () => ({
    default: (props: React.ComponentProps<typeof import('../../../components/PatientInfo').default>) => {
        patientInfoProps = props;
        return (
            <div>
                <button onClick={() => props.onActivateEdit({ type: 'patient-field-label', index: 0 })}>patient-activate</button>
                <button onClick={() => props.onPatientFieldChange(0, 'Jane Roe')}>patient-change</button>
                <button onClick={() => props.onPatientLabelChange(0, 'Nombre completo')}>patient-label</button>
                <button onClick={() => props.onRemovePatientField(0)}>patient-remove</button>
                <div>patient-info</div>
            </div>
        );
    },
}));

vi.mock('../../../components/ClinicalSection', () => ({
    default: (props: React.ComponentProps<typeof import('../../../components/ClinicalSection').default>) => {
        clinicalSectionProps.push(props);
        return (
            <div>
                <button onClick={() => props.onActivateEdit({ type: 'section-title', index: props.index })}>
                    activate-section-{props.index}
                </button>
                <button onClick={() => props.onSectionContentChange(props.index, `contenido-${props.index}`)}>
                    content-section-{props.index}
                </button>
                <button onClick={() => props.onSectionTitleChange(props.index, `titulo-${props.index}`)}>
                    title-section-{props.index}
                </button>
                <button onClick={() => props.onRemoveSection(props.index)}>
                    remove-section-{props.index}
                </button>
                <button onClick={() => props.onUpdateSectionMeta?.(props.index, { updateDate: '2026-03-20' })}>
                    meta-section-{props.index}
                </button>
                <div>section-{props.index}</div>
            </div>
        );
    },
}));

vi.mock('../../../components/Footer', () => ({
    default: (props: React.ComponentProps<typeof import('../../../components/Footer').default>) => {
        footerProps = props;
        return (
            <div>
                <button onClick={() => props.onMedicoChange('Dr. House')}>footer-medico</button>
                <button onClick={() => props.onEspecialidadChange('Urgencia')}>footer-especialidad</button>
                <div>footer</div>
            </div>
        );
    },
}));

const createProps = (): React.ComponentProps<typeof AppWorkspace> => ({
    record: {
        version: 'v14',
        templateId: '2',
        title: 'Informe actual',
        patientFields: [{ id: 'nombre', label: 'Nombre', value: 'Jane', type: 'text' }],
        sections: [
            { id: 'sec-1', title: 'Diagnóstico', content: 'Contenido 1' },
            { id: 'sec-2', title: 'Plan', content: 'Contenido 2', kind: 'clinical-update' },
        ],
        medico: 'Dr. Test',
        especialidad: 'Medicina',
    },
    header: {
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
            isEditing: true,
            onToggleEdit: vi.fn(),
            isAdvancedEditing: true,
            onToggleAdvancedEditing: vi.fn(),
            isAiAssistantVisible: true,
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
    },
    editor: {
        isEditing: true,
        isGlobalStructureEditing: true,
        activeEditTarget: { type: 'section-title', index: 1 },
        activateEditTarget: vi.fn(),
        handleActivatePatientEdit: vi.fn(),
        handleActivateSectionEdit: vi.fn(),
        handlePatientFieldChange: vi.fn(),
        handlePatientLabelChange: vi.fn(),
        handleSectionContentChange: vi.fn(),
        handleSectionTitleChange: vi.fn(),
        handleUpdateSectionMeta: vi.fn(),
        handleRemoveSection: vi.fn(),
        handleRemovePatientField: vi.fn(),
        handleMedicoChange: vi.fn(),
        handleEspecialidadChange: vi.fn(),
        onRecordTitleChange: vi.fn(),
        onAddPatientField: vi.fn(),
        onAddSection: vi.fn(),
        sheetZoom: 1.25,
    },
    panels: {
        aiAssistant: <div>assistant-panel</div>,
        integrationPanel: <div>integration-panel</div>,
    },
});

describe('AppWorkspace', () => {
    it('conecta Header, PatientInfo, secciones y Footer con el estado principal', () => {
        clinicalSectionProps.length = 0;
        const props = createProps();
        render(<AppWorkspace {...props} />);

        expect(screen.getByText('header')).toBeTruthy();
        expect(screen.getByText('patient-info')).toBeTruthy();
        expect(screen.getByText('section-0')).toBeTruthy();
        expect(screen.getByText('section-1')).toBeTruthy();
        expect(screen.getByText('footer')).toBeTruthy();
        expect(screen.getByText('assistant-panel')).toBeTruthy();
        expect(screen.getByText('integration-panel')).toBeTruthy();

        fireEvent.click(screen.getByText('header-template'));
        fireEvent.click(screen.getByText('header-add-update'));
        fireEvent.click(screen.getByText('header-print'));
        fireEvent.click(screen.getByText('header-settings'));
        fireEvent.click(screen.getByText('header-restore'));
        fireEvent.click(screen.getByText('header-cartola'));

        fireEvent.click(screen.getByText('patient-activate'));
        fireEvent.click(screen.getByText('patient-change'));
        fireEvent.click(screen.getByText('patient-label'));
        fireEvent.click(screen.getByText('patient-remove'));

        fireEvent.click(screen.getByText('activate-section-0'));
        fireEvent.click(screen.getByText('content-section-0'));
        fireEvent.click(screen.getByText('title-section-1'));
        fireEvent.click(screen.getByText('remove-section-1'));
        fireEvent.click(screen.getByText('meta-section-1'));

        fireEvent.click(screen.getByText('footer-medico'));
        fireEvent.click(screen.getByText('footer-especialidad'));

        expect(props.header.onTemplateChange).toHaveBeenCalledWith('5');
        expect(props.header.onAddClinicalUpdateSection).toHaveBeenCalled();
        expect(props.header.onPrint).toHaveBeenCalled();
        expect(props.header.onOpenSettings).toHaveBeenCalled();
        expect(props.header.onRestoreTemplate).toHaveBeenCalled();
        expect(props.header.onOpenCartolaApp).toHaveBeenCalled();
        expect(props.editor.handleActivatePatientEdit).toHaveBeenCalledWith({ type: 'patient-field-label', index: 0 });
        expect(props.editor.handlePatientFieldChange).toHaveBeenCalledWith(0, 'Jane Roe');
        expect(props.editor.handlePatientLabelChange).toHaveBeenCalledWith(0, 'Nombre completo');
        expect(props.editor.handleRemovePatientField).toHaveBeenCalledWith(0);
        expect(props.editor.handleActivateSectionEdit).toHaveBeenCalledWith({ type: 'section-title', index: 0 });
        expect(props.editor.handleSectionContentChange).toHaveBeenCalledWith(0, 'contenido-0');
        expect(props.editor.handleSectionTitleChange).toHaveBeenCalledWith(1, 'titulo-1');
        expect(props.editor.handleRemoveSection).toHaveBeenCalledWith(1);
        expect(props.editor.handleUpdateSectionMeta).toHaveBeenCalledWith(1, { updateDate: '2026-03-20' });
        expect(props.editor.handleMedicoChange).toHaveBeenCalledWith('Dr. House');
        expect(props.editor.handleEspecialidadChange).toHaveBeenCalledWith('Urgencia');
    });

    it('filtra activeEditTarget y actualiza el título al perder foco', () => {
        clinicalSectionProps.length = 0;
        const props = createProps();
        render(<AppWorkspace {...props} />);

        const title = screen.getByText('Informe actual');
        fireEvent.doubleClick(title);
        Object.defineProperty(title, 'innerText', {
            configurable: true,
            value: 'Nuevo informe',
        });
        fireEvent.blur(title);
        fireEvent.click(screen.getByText('Agregar campo'));
        fireEvent.click(screen.getByText('Agregar nueva sección'));

        expect(props.editor.activateEditTarget).toHaveBeenCalledWith({ type: 'record-title' });
        expect(props.editor.onRecordTitleChange).toHaveBeenCalledWith('Nuevo informe');
        expect(props.editor.onAddPatientField).toHaveBeenCalled();
        expect(props.editor.onAddSection).toHaveBeenCalled();
        expect(patientInfoProps?.activeEditTarget).toBeNull();
        expect(clinicalSectionProps[0]?.activeEditTarget).toBeNull();
        expect(clinicalSectionProps[1]?.activeEditTarget).toEqual({ type: 'section-title', index: 1 });
        expect(headerProps?.templateId).toBe('2');
        expect(footerProps?.medico).toBe('Dr. Test');
        expect(footerProps?.especialidad).toBe('Medicina');
        expect(document.getElementById('sheet')?.className).toContain('edit-mode');
    });
});
