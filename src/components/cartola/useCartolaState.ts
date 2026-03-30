import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { ControlInfo, ExamOptions, Injectable, Inhaler, Medication, Patient } from './types';
import {
    buildExportBaseName,
    createEmptyPatient,
    initialControlInfo,
    medicationCategoryLabels,
    medicationCategoryOrder,
    normalizeMedications,
    testPatientData,
    type MedicationInput,
} from './cartolaDomain';

export const useCartolaState = () => {
    const today = new Date().toISOString().split('T')[0];
    const [patient, setPatient] = useState<Patient>(createEmptyPatient(today));
    const [medications, setMedications] = useState<Medication[]>([]);
    const [injectables, setInjectables] = useState<Injectable[]>([]);
    const [inhalers, setInhalers] = useState<Inhaler[]>([]);
    const [controlInfo, setControlInfo] = useState<ControlInfo>(initialControlInfo);
    const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
    const [editingInjectable, setEditingInjectable] = useState<Injectable | null>(null);
    const [editingInhaler, setEditingInhaler] = useState<Inhaler | null>(null);
    const [activeTab, setActiveTab] = useState<'oral' | 'injectable' | 'inhaled'>('oral');
    const [showQr, setShowQr] = useState(false);
    const [view, setView] = useState<'guide' | 'glycemia'>('guide');
    const [showAppsMenu, setShowAppsMenu] = useState(false);
    const [draggedMedicationId, setDraggedMedicationId] = useState<number | null>(null);
    const [showCategoryLabels, setShowCategoryLabels] = useState(true);
    const [showIcons, setShowIcons] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getExportBaseName = useCallback(() => buildExportBaseName(patient, today), [patient, today]);

    const handlePatientChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setPatient(prev => ({ ...prev, [name]: value }));
    }, []);

    const addMedication = useCallback((medication: MedicationInput) => {
        setMedications(prev => {
            const medsInCategory = prev.filter(entry => entry.category === medication.category);
            const nextOrder = medsInCategory.length ? Math.max(...medsInCategory.map(entry => entry.order)) + 1 : 0;
            return [...prev, { ...medication, id: Date.now(), order: nextOrder }];
        });
    }, []);

    const updateMedication = useCallback((id: number, medication: MedicationInput) => {
        setMedications(prev => prev.map(entry => (entry.id === id ? { ...entry, ...medication } : entry)));
    }, []);

    const removeMedication = useCallback((id: number) => {
        setMedications(prev => {
            const medicationToRemove = prev.find(entry => entry.id === id);
            if (!medicationToRemove) return prev;

            const filtered = prev.filter(entry => entry.id !== id);
            const medsInCategory = filtered
                .filter(entry => entry.category === medicationToRemove.category)
                .sort((a, b) => a.order - b.order)
                .map((entry, index) => ({ ...entry, order: index }));
            const otherMeds = filtered.filter(entry => entry.category !== medicationToRemove.category);
            return [...otherMeds, ...medsInCategory];
        });
    }, []);

    const handleMedicationReorder = useCallback((sourceId: number, targetId: number) => {
        if (sourceId === targetId) return;

        setMedications(prev => {
            const sourceMedication = prev.find(entry => entry.id === sourceId);
            const targetMedication = prev.find(entry => entry.id === targetId);
            if (!sourceMedication || !targetMedication || sourceMedication.category !== targetMedication.category) {
                return prev;
            }

            const medsInCategory = prev
                .filter(entry => entry.category === sourceMedication.category)
                .sort((a, b) => a.order - b.order);
            const sourceIndex = medsInCategory.findIndex(entry => entry.id === sourceId);
            const targetIndex = medsInCategory.findIndex(entry => entry.id === targetId);
            if (sourceIndex === -1 || targetIndex === -1) {
                return prev;
            }

            const updatedCategory = [...medsInCategory];
            const [removed] = updatedCategory.splice(sourceIndex, 1);
            updatedCategory.splice(targetIndex, 0, removed);
            const orderMap = new Map(updatedCategory.map((entry, index) => [entry.id, index]));
            return prev.map(entry =>
                entry.category === sourceMedication.category && orderMap.has(entry.id)
                    ? { ...entry, order: orderMap.get(entry.id)! }
                    : entry,
            );
        });
    }, []);

    const addInjectable = useCallback((injectable: Omit<Injectable, 'id'>) => {
        setInjectables(prev => {
            const existingIndex = prev.findIndex(entry => entry.type === injectable.type && entry.schedule === injectable.schedule);
            if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...prev[existingIndex], ...injectable };
                return updated;
            }
            return [...prev, { ...injectable, id: Date.now() }];
        });
    }, []);

    const updateInjectable = useCallback((id: number, injectable: Omit<Injectable, 'id'>) => {
        setInjectables(prev => prev.map(entry => (entry.id === id ? { ...entry, ...injectable } : entry)));
    }, []);

    const removeInjectable = useCallback((id: number) => {
        setInjectables(prev => prev.filter(entry => entry.id !== id));
    }, []);

    const addInhaler = useCallback((inhaler: Omit<Inhaler, 'id'>) => {
        setInhalers(prev => [...prev, { ...inhaler, id: Date.now() }]);
    }, []);

    const updateInhaler = useCallback((id: number, inhaler: Omit<Inhaler, 'id'>) => {
        setInhalers(prev => prev.map(entry => (entry.id === id ? { ...entry, ...inhaler } : entry)));
    }, []);

    const removeInhaler = useCallback((id: number) => {
        setInhalers(prev => prev.filter(entry => entry.id !== id));
    }, []);

    const handleControlChange = useCallback((field: keyof ControlInfo, value: string | boolean | ExamOptions) => {
        setControlInfo(prev => ({ ...prev, [field]: value }));
    }, []);

    const handlePrint = useCallback(() => {
        const previousTitle = document.title;
        document.title = getExportBaseName();
        window.print();
        setTimeout(() => {
            document.title = previousTitle;
        }, 500);
    }, [getExportBaseName]);

    const handleExportList = useCallback(() => {
        const blob = new Blob([JSON.stringify({ patient, medications, injectables, inhalers })], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${getExportBaseName()}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }, [getExportBaseName, inhalers, injectables, medications, patient]);

    const handleLoadTestPatient = useCallback(() => {
        setPatient({ ...testPatientData.patient });
        setMedications(normalizeMedications(testPatientData.medications.map(entry => ({ ...entry }))));
        setInjectables(testPatientData.injectables.map(entry => ({ ...entry })));
        setInhalers(testPatientData.inhalers.map(entry => ({ ...entry })));
    }, []);

    const handleImportList = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = loadEvent => {
            try {
                const data = JSON.parse(loadEvent.target?.result as string) as {
                    patient?: Patient;
                    medications?: Medication[];
                    injectables?: Injectable[];
                    inhalers?: Inhaler[];
                };
                setPatient(data.patient || createEmptyPatient(today));
                setMedications(normalizeMedications(data.medications || []));
                setInjectables(data.injectables || []);
                setInhalers(data.inhalers || []);
            } catch (error) {
                console.error('Error al importar lista', error);
            }
        };
        reader.readAsText(file);
    }, [today]);

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const medicationsByCategory = useMemo(() => medicationCategoryOrder.map(category => ({
        category,
        label: medicationCategoryLabels[category],
        meds: medications
            .filter(entry => entry.category === category)
            .sort((a, b) => a.order - b.order),
    })), [medications]);

    const hasMedications = useMemo(() => medicationsByCategory.some(group => group.meds.length > 0), [medicationsByCategory]);

    const startEditingMedication = useCallback((medication: Medication) => {
        setActiveTab('oral');
        setEditingMedication(medication);
    }, []);

    const startEditingInjectable = useCallback((injectable: Injectable) => {
        setActiveTab('injectable');
        setEditingInjectable(injectable);
    }, []);

    const startEditingInhaler = useCallback((inhaler: Inhaler) => {
        setActiveTab('inhaled');
        setEditingInhaler(inhaler);
    }, []);

    return {
        patient,
        medications,
        injectables,
        inhalers,
        controlInfo,
        editingMedication,
        editingInjectable,
        editingInhaler,
        activeTab,
        showQr,
        view,
        showAppsMenu,
        draggedMedicationId,
        showCategoryLabels,
        showIcons,
        fileInputRef,
        medicationsByCategory,
        hasMedications,
        setActiveTab,
        setShowQr,
        setView,
        setShowAppsMenu,
        setDraggedMedicationId,
        setShowCategoryLabels,
        setShowIcons,
        setEditingMedication,
        setEditingInjectable,
        setEditingInhaler,
        handlePatientChange,
        addMedication,
        updateMedication,
        removeMedication,
        handleMedicationReorder,
        addInjectable,
        updateInjectable,
        removeInjectable,
        addInhaler,
        updateInhaler,
        removeInhaler,
        handleControlChange,
        handlePrint,
        handleExportList,
        handleLoadTestPatient,
        handleImportList,
        handleImportClick,
        startEditingMedication,
        startEditingInjectable,
        startEditingInhaler,
    };
};
