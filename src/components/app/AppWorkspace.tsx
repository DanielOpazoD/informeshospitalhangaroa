import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ClinicalRecord, ClinicalSectionData } from '../../types';
import Header from '../Header';
import PatientInfo from '../PatientInfo';
import ClinicalSection from '../ClinicalSection';
import EditorToolbar from '../EditorToolbar';
import Footer from '../Footer';
import { logoUrls } from '../../institutionConfig';
import type { HeaderAuthProps, HeaderDriveProps, HeaderEditingProps, HeaderSaveProps } from '../Header';

interface AppWorkspaceProps {
    record: ClinicalRecord;
    auth: HeaderAuthProps;
    driveHeader: HeaderDriveProps;
    editingHeader: HeaderEditingProps;
    saveHeader: HeaderSaveProps;
    templateId: string;
    onTemplateChange: (id: string) => void;
    onAddClinicalUpdateSection: () => void;
    onPrint: () => void;
    onOpenSettings: () => void;
    onRestoreTemplate: () => void;
    onOpenCartola: () => void;
    isEditing: boolean;
    isGlobalStructureEditing: boolean;
    activeEditTarget:
        | { type: 'patient-section-title' }
        | { type: 'patient-field-label'; index: number }
        | { type: 'section-title'; index: number }
        | { type: 'record-title' }
        | null;
    activateEditTarget: (target: { type: 'record-title' }) => void;
    handleActivatePatientEdit: (target: {
        type: 'patient-section-title' | 'patient-field-label';
        index?: number;
    }) => void;
    handleActivateSectionEdit: (target: { type: 'section-title'; index: number }) => void;
    handlePatientFieldChange: (index: number, value: string) => void;
    handlePatientLabelChange: (index: number, label: string) => void;
    handleSectionContentChange: (index: number, content: string) => void;
    handleSectionTitleChange: (index: number, title: string) => void;
    handleUpdateSectionMeta: (index: number, meta: Partial<ClinicalSectionData>) => void;
    handleRemoveSection: (index: number) => void;
    handleRemovePatientField: (index: number) => void;
    handleMedicoChange: (value: string) => void;
    handleEspecialidadChange: (value: string) => void;
    onRecordTitleChange: (title: string) => void;
    onAddPatientField: () => void;
    onAddSection: () => void;
    sheetZoom: number;
    aiAssistant: React.ReactNode;
    integrationPanel: React.ReactNode;
}

const AppWorkspace: React.FC<AppWorkspaceProps> = ({
    record,
    auth,
    driveHeader,
    editingHeader,
    saveHeader,
    templateId,
    onTemplateChange,
    onAddClinicalUpdateSection,
    onPrint,
    onOpenSettings,
    onRestoreTemplate,
    onOpenCartola,
    isEditing,
    isGlobalStructureEditing,
    activeEditTarget,
    activateEditTarget,
    handleActivatePatientEdit,
    handleActivateSectionEdit,
    handlePatientFieldChange,
    handlePatientLabelChange,
    handleSectionContentChange,
    handleSectionTitleChange,
    handleUpdateSectionMeta,
    handleRemoveSection,
    handleRemovePatientField,
    handleMedicoChange,
    handleEspecialidadChange,
    onRecordTitleChange,
    onAddPatientField,
    onAddSection,
    sheetZoom,
    aiAssistant,
    integrationPanel,
}) => {
    const headerHostRef = useRef<HTMLDivElement | null>(null);
    const integrationPanelHostRef = useRef<HTMLDivElement | null>(null);
    const sheetRef = useRef<HTMLDivElement | null>(null);
    const [topbarHeight, setTopbarHeight] = useState(0);
    const [integrationPanelHeight, setIntegrationPanelHeight] = useState(0);
    const [sideRailLeft, setSideRailLeft] = useState(16);
    const [sideRailWidth, setSideRailWidth] = useState(220);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateOffsets = () => {
            setTopbarHeight(headerHostRef.current?.getBoundingClientRect().height ?? 0);
            setIntegrationPanelHeight(integrationPanelHostRef.current?.getBoundingClientRect().height ?? 0);
            if (sheetRef.current) {
                const sheetRect = sheetRef.current.getBoundingClientRect();
                const nextLeft = Math.max(16, Math.round(sheetRect.right + 18));
                const availableWidth = Math.max(180, Math.floor(window.innerWidth - nextLeft - 16));
                setSideRailLeft(nextLeft);
                setSideRailWidth(Math.min(240, availableWidth));
            }
        };

        updateOffsets();

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => updateOffsets())
            : null;
        if (resizeObserver && headerHostRef.current) resizeObserver.observe(headerHostRef.current);
        if (resizeObserver && integrationPanelHostRef.current) resizeObserver.observe(integrationPanelHostRef.current);
        if (resizeObserver && sheetRef.current) resizeObserver.observe(sheetRef.current);

        window.addEventListener('resize', updateOffsets);
        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updateOffsets);
        };
    }, [sheetZoom]);

    const stickyLayoutStyle = useMemo(() => ({
        '--topbar-height': `${topbarHeight}px`,
        '--toolbar-top-offset': `${topbarHeight + integrationPanelHeight + 12}px`,
    } as React.CSSProperties), [integrationPanelHeight, topbarHeight]);

    const sideRailStyle = useMemo(() => ({
        '--side-rail-left': `${sideRailLeft}px`,
        '--side-rail-width': `${sideRailWidth}px`,
    } as React.CSSProperties), [sideRailLeft, sideRailWidth]);

    const showSideRail = editingHeader.isAdvancedEditing || isGlobalStructureEditing;

    return (
        <div className="wrap" style={stickyLayoutStyle}>
            <div ref={headerHostRef}>
                <Header
                    templateId={templateId}
                    onTemplateChange={onTemplateChange}
                    onAddClinicalUpdateSection={onAddClinicalUpdateSection}
                    onPrint={onPrint}
                    onOpenSettings={onOpenSettings}
                    onRestoreTemplate={onRestoreTemplate}
                    onOpenCartolaApp={onOpenCartola}
                    auth={auth}
                    drive={driveHeader}
                    editing={editingHeader}
                    save={saveHeader}
                />
            </div>
            <div ref={integrationPanelHostRef}>
                {integrationPanel}
            </div>
            <div className="workspace">
                <div className="sheet-shell">
                    <div
                        id="sheet"
                        ref={sheetRef}
                        className={`sheet ${isEditing ? 'edit-mode' : ''}`}
                        style={{ '--sheet-zoom': sheetZoom } as React.CSSProperties}
                    >
                        {logoUrls.left && (
                            <img
                                id="logoLeft"
                                src={logoUrls.left}
                                className="absolute top-2 left-2 w-12 h-auto opacity-60 print:block"
                                alt="Logo Left"
                            />
                        )}
                        {logoUrls.right && (
                            <img
                                id="logoRight"
                                src={logoUrls.right}
                                className="absolute top-2 right-2 w-12 h-auto opacity-60 print:block"
                                alt="Logo Right"
                            />
                        )}
                        <div
                            className="title"
                            contentEditable={
                                record.templateId === '5' || (isEditing && activeEditTarget?.type === 'record-title')
                            }
                            suppressContentEditableWarning
                            onDoubleClick={() => activateEditTarget({ type: 'record-title' })}
                            onBlur={e => onRecordTitleChange(e.currentTarget.innerText)}
                        >
                            {record.title}
                        </div>
                        <PatientInfo
                            isEditing={isEditing}
                            isGlobalStructureEditing={isGlobalStructureEditing}
                            activeEditTarget={
                                activeEditTarget?.type === 'patient-section-title' ||
                                activeEditTarget?.type === 'patient-field-label'
                                    ? activeEditTarget
                                    : null
                            }
                            onActivateEdit={handleActivatePatientEdit}
                            patientFields={record.patientFields}
                            onPatientFieldChange={handlePatientFieldChange}
                            onPatientLabelChange={handlePatientLabelChange}
                            onRemovePatientField={handleRemovePatientField}
                        />
                        <div id="sectionsContainer">
                            {record.sections.map((section, index) => (
                                <ClinicalSection
                                    key={section.id}
                                    section={section}
                                    index={index}
                                    isEditing={isEditing}
                                    isAdvancedEditing={editingHeader.isAdvancedEditing}
                                    isGlobalStructureEditing={isGlobalStructureEditing}
                                    activeEditTarget={
                                        activeEditTarget?.type === 'section-title' && activeEditTarget.index === index
                                            ? activeEditTarget
                                            : null
                                    }
                                    onActivateEdit={handleActivateSectionEdit}
                                    onSectionContentChange={handleSectionContentChange}
                                    onSectionTitleChange={handleSectionTitleChange}
                                    onRemoveSection={handleRemoveSection}
                                    onUpdateSectionMeta={handleUpdateSectionMeta}
                                />
                            ))}
                        </div>
                        <Footer
                            medico={record.medico}
                            especialidad={record.especialidad}
                            onMedicoChange={handleMedicoChange}
                            onEspecialidadChange={handleEspecialidadChange}
                        />
                    </div>
                </div>
                {showSideRail && (
                    <div className="workspace-side-rail" style={sideRailStyle}>
                        {editingHeader.isAdvancedEditing && (
                            <div className="sticky-toolbar-container">
                                <EditorToolbar onToolbarCommand={editingHeader.onToolbarCommand} />
                            </div>
                        )}
                        <div id="editPanel" className={`edit-panel ${isGlobalStructureEditing ? 'visible' : 'hidden'}`}>
                            <div>Edición</div>
                            <button onClick={onAddPatientField} className="btn" type="button">
                                Agregar campo
                            </button>
                            <button onClick={onAddSection} className="btn" type="button">
                                Agregar nueva sección
                            </button>
                        </div>
                    </div>
                )}
                <Suspense fallback={null}>{aiAssistant}</Suspense>
            </div>
        </div>
    );
};

export default AppWorkspace;
