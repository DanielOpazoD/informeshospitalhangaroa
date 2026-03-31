import React, { Suspense } from 'react';
import Header from '../Header';
import PatientInfo from '../PatientInfo';
import ClinicalSection from '../ClinicalSection';
import PlanSection from '../PlanSection';
import FloatingFormatBar from '../FloatingFormatBar';
import Footer from '../Footer';
import { ErrorBoundary } from '../ErrorBoundary';
import { logoUrls } from '../../institutionConfig';
import { useWorkspaceSideRailLayout } from '../../hooks/useWorkspaceSideRailLayout';
import type { AppWorkspaceProps } from './appShellViewModel';
import { getPatientEditTarget, getSectionEditTarget } from './appShellViewModel';
import { CUSTOM_TEMPLATE_ID } from '../../utils/recordTemplates';
import { isPlanSection } from '../../utils/planSectionUtils';

/**
 * Fallback silencioso para el panel de IA: si el asistente falla al
 * renderizar no derrumba toda la app — simplemente desaparece.
 */
const AiFallback: React.FC = () => (
    <div style={{ padding: '12px 16px', fontSize: 12, color: '#ef4444' }}>
        El asistente de IA no pudo cargarse. Recarga la página para intentarlo nuevamente.
    </div>
);

const AppWorkspace: React.FC<AppWorkspaceProps> = ({
    record,
    header,
    editor,
    panels,
}) => {
    const {
        headerHostRef,
        integrationPanelHostRef,
        sheetRef,
        stickyLayoutStyle,
        sideRailStyle,
    } = useWorkspaceSideRailLayout(editor.sheetZoom);
    const showSideRail = editor.isGlobalStructureEditing;

    return (
        <div className="wrap" style={stickyLayoutStyle}>
            <div ref={headerHostRef}>
                <Header {...header} />
            </div>
            <div ref={integrationPanelHostRef}>
                {panels.integrationPanel}
            </div>
            <div className="workspace">
                <div className="sheet-shell">
                    <div
                        id="sheet"
                        ref={sheetRef}
                        className={`sheet ${editor.isEditing ? 'edit-mode' : ''}`}
                        style={{ '--sheet-zoom': editor.sheetZoom } as React.CSSProperties}
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
                                record.templateId === CUSTOM_TEMPLATE_ID || (editor.isEditing && editor.activeEditTarget?.type === 'record-title')
                            }
                            suppressContentEditableWarning
                            onDoubleClick={() => editor.activateEditTarget({ type: 'record-title' })}
                            onBlur={e => editor.onRecordTitleChange(e.currentTarget.innerText)}
                        >
                            {record.title}
                        </div>
                        <PatientInfo
                            isEditing={editor.isEditing}
                            isGlobalStructureEditing={editor.isGlobalStructureEditing}
                            activeEditTarget={getPatientEditTarget(editor.activeEditTarget)}
                            onActivateEdit={editor.handleActivatePatientEdit}
                            patientFields={record.patientFields}
                            onPatientFieldChange={editor.handlePatientFieldChange}
                            onPatientLabelChange={editor.handlePatientLabelChange}
                            onRemovePatientField={editor.handleRemovePatientField}
                        />
                        <div id="sectionsContainer">
                            {record.sections.map((section, index) =>
                                isPlanSection(section.title) ? (
                                    <PlanSection
                                        key={section.id}
                                        section={section}
                                        index={index}
                                        isEditing={editor.isEditing}
                                        isAdvancedEditing={header.editing.isAdvancedEditing}
                                        isGlobalStructureEditing={editor.isGlobalStructureEditing}
                                        activeEditTarget={getSectionEditTarget(editor.activeEditTarget, index)}
                                        onActivateEdit={editor.handleActivateSectionEdit}
                                        onSectionContentChange={editor.handleSectionContentChange}
                                        onSectionTitleChange={editor.handleSectionTitleChange}
                                        onRemoveSection={editor.handleRemoveSection}
                                    />
                                ) : (
                                    <ClinicalSection
                                        key={section.id}
                                        section={section}
                                        index={index}
                                        isEditing={editor.isEditing}
                                        isAdvancedEditing={header.editing.isAdvancedEditing}
                                        isGlobalStructureEditing={editor.isGlobalStructureEditing}
                                        activeEditTarget={getSectionEditTarget(editor.activeEditTarget, index)}
                                        onActivateEdit={editor.handleActivateSectionEdit}
                                        onSectionContentChange={editor.handleSectionContentChange}
                                        onSectionTitleChange={editor.handleSectionTitleChange}
                                        onRemoveSection={editor.handleRemoveSection}
                                        onUpdateSectionMeta={editor.handleUpdateSectionMeta}
                                    />
                                ),
                            )}
                        </div>
                                <FloatingFormatBar
                            onToolbarCommand={header.editing.onToolbarCommand}
                            pinned={header.editing.isAdvancedEditing}
                            onClosePinned={header.editing.onToggleAdvancedEditing}
                        />
                <Footer
                            medico={record.medico}
                            especialidad={record.especialidad}
                            onMedicoChange={editor.handleMedicoChange}
                            onEspecialidadChange={editor.handleEspecialidadChange}
                        />
                    </div>
                </div>
                {showSideRail && (
                    <div className="workspace-side-rail" style={sideRailStyle}>
                        <div
                            id="editPanel"
                            className={`edit-panel ${editor.isGlobalStructureEditing ? 'visible' : 'hidden'}`}
                        >
                            <div>Estructura</div>
                            <div className="edit-panel-section">
                                <div className="edit-panel-section-title">Insertar</div>
                                <button onClick={editor.onAddPatientField} className="btn" type="button">
                                    Agregar campo
                                </button>
                                <button onClick={editor.onAddSection} className="btn" type="button">
                                    Agregar nueva sección
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <ErrorBoundary fallback={<AiFallback />}>
                    <Suspense fallback={null}>{panels.aiAssistant}</Suspense>
                </ErrorBoundary>
            </div>
        </div>
    );
};

export default AppWorkspace;
