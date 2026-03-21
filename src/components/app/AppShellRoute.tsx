import React, { Suspense, lazy } from 'react';
import AppShellContent from './AppShellContent';
import { useAppShellController, type AppShellRouteProps } from '../../hooks/useAppShellController';

const AIAssistant = lazy(() => import('../AIAssistant'));
const HhrIntegrationPanel = lazy(() => import('../hhr/HhrIntegrationPanel'));
const HhrCensusModal = lazy(() => import('../hhr/HhrCensusModal'));

const AppShellRoute: React.FC<AppShellRouteProps & { onOpenCartola: () => void }> = ({
    toast,
    showToast,
    clientId,
    setClientId,
    onOpenCartola,
}) => {
    const controller = useAppShellController({
        clientId,
        setClientId,
        showToast,
    });

    return (
        <AppShellContent
            toast={toast}
            settings={controller.settings}
            driveModals={controller.driveModals}
            editorUi={controller.editorUi}
            fileOperations={controller.fileOperations}
            auth={controller.auth}
            drive={controller.drive}
            recordState={controller.recordState}
            toggleGlobalStructureEditing={controller.handlers.toggleGlobalStructureEditing}
            handleTemplateChange={controller.handlers.handleTemplateChange}
            handleAddClinicalUpdateSection={controller.handlers.handleAddClinicalUpdateSection}
            handleRecordTitleChange={controller.handlers.handleRecordTitleChange}
            handleAddPatientField={controller.handlers.handleAddPatientField}
            handleAddSection={controller.handlers.handleAddSection}
            handleRestoreAll={controller.handlers.handleRestoreAll}
            handleToolbarCommand={controller.handlers.handleToolbarCommand}
            onOpenCartola={onOpenCartola}
            aiAssistantPanel={(
                <AIAssistant
                    sections={controller.aiAssistant.aiSections}
                    apiKey={controller.aiAssistant.resolvedAiApiKey}
                    projectId={controller.aiAssistant.resolvedAiProjectId}
                    model={controller.aiAssistant.resolvedAiModel}
                    allowModelAutoSelection={controller.aiAssistant.allowAiAutoSelection}
                    onAutoModelSelected={controller.aiAssistant.handleAutoSelectAiModel}
                    onApplySuggestion={controller.recordState.handleSectionContentChange}
                    fullRecordContent={controller.aiAssistant.fullRecordContext}
                    isOpen={controller.editorUi.isAiAssistantVisible}
                    onClose={() => controller.editorUi.setIsAiAssistantVisible(false)}
                    conversationKey={controller.aiAssistant.aiConversationKey}
                    panelWidth={controller.editorUi.aiPanelWidth}
                    onPanelWidthChange={controller.editorUi.setAiPanelWidth}
                />
            )}
            hhrHeader={controller.hhrController.hhrHeader}
            hhrPanel={(
                <Suspense fallback={null}>
                    <HhrIntegrationPanel {...controller.hhrController.hhrPanel} />
                </Suspense>
            )}
            hhrModal={(
                <Suspense fallback={null}>
                    <HhrCensusModal {...controller.hhrController.hhrModal} />
                </Suspense>
            )}
        />
    );
};

export default AppShellRoute;
