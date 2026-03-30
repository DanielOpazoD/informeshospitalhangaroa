import React, { useRef } from 'react';
import PatientInfoForm from './PatientInfoForm';
import MedicationForm from './MedicationForm';
import InjectableForm from './InjectableForm';
import InhalerForm from './InhalerForm';
import SchedulePreview from './SchedulePreview';
import TrashIcon from './icons/TrashIcon';
import ControlInfoForm from './ControlInfoForm';
import SuspensionSection from './SuspensionSection';
import MoneyIcon from './icons/MoneyIcon';
import StarIcon from './icons/StarIcon';
import ArrowUpIcon from './icons/ArrowUpIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import GlycemiaTable from './GlycemiaTable';
import { describeMedicationDose } from './cartolaDomain';
import { useCartolaState } from './useCartolaState';

const App: React.FC = () => {
    const previewRef = useRef<HTMLDivElement>(null);
    const cartola = useCartolaState();

    if (cartola.view === 'glycemia') {
        return <GlycemiaTable onBack={() => cartola.setView('guide')} patient={cartola.patient} />;
    }

    return (
        <div className="min-h-screen font-sans text-slate-800">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-blue-700">Guía de Medicamentos</h1>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={cartola.handleLoadTestPatient}
                            className="bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-1"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Cargar paciente de prueba
                        </button>
                        <button
                            onClick={cartola.handleExportList}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-1"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M3 3a2 2 0 012-2h6a2 2 0 012 2v3h-2V3H5v14h6v-3h2v3a2 2 0 01-2 2H5a2 2 0 01-2-2V3z"/><path d="M9 7h2v5h3l-4 4-4-4h3V7z"/></svg>
                            Exportar Lista
                        </button>
                        <button
                            onClick={cartola.handleImportClick}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-1"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M3 3a2 2 0 012-2h6a2 2 0 012 2v3h-2V3H5v14h6v-3h2v3a2 2 0 01-2 2H5a2 2 0 01-2-2V3z"/><path d="M11 13H9V8H6l4-4 4 4h-3v5z"/></svg>
                            Importar Lista
                        </button>
                        <input ref={cartola.fileInputRef} type="file" accept="application/json" className="hidden" onChange={cartola.handleImportList} />
                        <button
                            onClick={cartola.handlePrint}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-1"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v2h12V4a2 2 0 00-2-2H6zm10 6H4v8a2 2 0 002 2h8a2 2 0 002-2V8zM6 10h8v2H6v-2z" clipRule="evenodd" />
                            </svg>
                            Imprimir / Guardar PDF
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => cartola.setShowAppsMenu(prev => !prev)}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105"
                                type="button"
                            >
                                Otras aplicaciones
                            </button>
                            {cartola.showAppsMenu && (
                                <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-10">
                                    <button
                                        onClick={() => { cartola.setView('glycemia'); cartola.setShowAppsMenu(false); }}
                                        className="block w-full text-left px-4 py-2 hover:bg-slate-100"
                                        type="button"
                                    >
                                        Automonitoreo de glicemia
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
                    <PatientInfoForm patient={cartola.patient} onChange={cartola.handlePatientChange} showQr={cartola.showQr} onToggleQr={cartola.setShowQr} />
                    <div>
                        <div className="flex border-b">
                            <button className={`flex-1 py-2 text-sm font-semibold ${cartola.activeTab === 'oral' ? 'border-b-2 border-blue-500' : ''}`} onClick={() => cartola.setActiveTab('oral')} type="button">Fármacos orales</button>
                            <button className={`flex-1 py-2 text-sm font-semibold ${cartola.activeTab === 'injectable' ? 'border-b-2 border-blue-500' : ''}`} onClick={() => cartola.setActiveTab('injectable')} type="button">Fármacos inyectables</button>
                            <button className={`flex-1 py-2 text-sm font-semibold ${cartola.activeTab === 'inhaled' ? 'border-b-2 border-blue-500' : ''}`} onClick={() => cartola.setActiveTab('inhaled')} type="button">Fármacos inhalados</button>
                        </div>
                        <div className="pt-4 space-y-4">
                            {cartola.activeTab === 'oral' && (
                                <>
                                    <MedicationForm
                                        onAddMedication={cartola.addMedication}
                                        onUpdateMedication={cartola.updateMedication}
                                        editingMedication={cartola.editingMedication}
                                        onCancelEdit={() => cartola.setEditingMedication(null)}
                                    />
                                    {cartola.hasMedications && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b pb-2">
                                                <h3 className="text-xl font-semibold text-slate-700">Medicamentos Añadidos</h3>
                                                <p className="text-xs text-slate-500">Arrastra y suelta para reordenar dentro de cada categoría.</p>
                                            </div>
                                            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                                                {cartola.medicationsByCategory.map(({ category, label, meds }) => (
                                                    meds.length > 0 && (
                                                        <div key={category} className="space-y-2">
                                                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</h4>
                                                            <ul className="space-y-3">
                                                                {meds.map(med => (
                                                                    <li
                                                                        key={med.id}
                                                                        className={`flex justify-between items-center bg-slate-50 p-3 rounded-lg shadow-sm border ${cartola.draggedMedicationId === med.id ? 'border-blue-400' : 'border-transparent'}`}
                                                                        draggable
                                                                        onDragStart={event => {
                                                                            cartola.setDraggedMedicationId(med.id);
                                                                            event.dataTransfer.effectAllowed = 'move';
                                                                        }}
                                                                        onDragOver={event => {
                                                                            event.preventDefault();
                                                                            event.dataTransfer.dropEffect = 'move';
                                                                        }}
                                                                        onDrop={event => {
                                                                            event.preventDefault();
                                                                            if (cartola.draggedMedicationId !== null) {
                                                                                cartola.handleMedicationReorder(cartola.draggedMedicationId, med.id);
                                                                            }
                                                                            cartola.setDraggedMedicationId(null);
                                                                        }}
                                                                        onDragEnd={() => cartola.setDraggedMedicationId(null)}
                                                                    >
                                                                        <div>
                                                                            <p className="font-bold text-blue-600 flex items-center gap-1">
                                                                                {med.isNewMedication && <StarIcon className="inline w-4 h-4 text-yellow-500" />}
                                                                                {med.doseIncreased && <ArrowUpIcon className="inline w-4 h-4" />}
                                                                                {med.doseDecreased && <ArrowDownIcon className="inline w-4 h-4" />}
                                                                                {med.requiresPurchase && <MoneyIcon className="inline w-4 h-4 text-green-600" />}
                                                                                {med.name} <span className="text-slate-600 font-normal">{med.presentacion}</span>
                                                                            </p>
                                                                            <p className="text-sm text-slate-500">{describeMedicationDose(med)}</p>
                                                                            {med.notes && <p className="text-xs text-slate-500 italic mt-1">Nota: {med.notes}</p>}
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button onClick={() => cartola.setEditingMedication(med)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors" aria-label="Editar medicamento">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21.036H3v-4.5L16.732 3.732z" /></svg>
                                                                            </button>
                                                                            <button onClick={() => cartola.removeMedication(med.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors" aria-label="Eliminar medicamento">
                                                                                <TrashIcon className="w-5 h-5" />
                                                                            </button>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {cartola.activeTab === 'injectable' && (
                                <>
                                    <InjectableForm onAddInjectable={cartola.addInjectable} onUpdateInjectable={cartola.updateInjectable} editingInjectable={cartola.editingInjectable} onCancelEdit={() => cartola.setEditingInjectable(null)} />
                                    {cartola.injectables.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-semibold text-slate-700 border-b pb-2">Tratamientos Inyectables Añadidos</h3>
                                            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                                {cartola.injectables.map(injectable => (
                                                    <li key={injectable.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg shadow-sm">
                                                        <div>
                                                            <p className="font-bold text-teal-600 flex items-center gap-1">
                                                                {injectable.isNewMedication && <StarIcon className="inline w-4 h-4 text-yellow-500" />}
                                                                {injectable.doseIncreased && <ArrowUpIcon className="inline w-4 h-4" />}
                                                                {injectable.doseDecreased && <ArrowDownIcon className="inline w-4 h-4" />}
                                                                {injectable.requiresPurchase && <MoneyIcon className="inline w-4 h-4 text-green-600" />}
                                                                {injectable.type}
                                                            </p>
                                                            <p className="text-sm text-slate-500">{`${injectable.dose} - ${injectable.schedule} a las ${injectable.time}`}</p>
                                                            {injectable.notes && <p className="text-xs text-slate-500 italic mt-1">Nota: {injectable.notes}</p>}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => cartola.setEditingInjectable(injectable)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors" aria-label="Editar inyectable">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21.036H3v-4.5L16.732 3.732z" /></svg>
                                                            </button>
                                                            <button onClick={() => cartola.removeInjectable(injectable.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors" aria-label="Eliminar inyectable">
                                                                <TrashIcon className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                            {cartola.activeTab === 'inhaled' && (
                                <>
                                    <InhalerForm onAddInhaler={cartola.addInhaler} onUpdateInhaler={cartola.updateInhaler} editingInhaler={cartola.editingInhaler} onCancelEdit={() => cartola.setEditingInhaler(null)} />
                                    {cartola.inhalers.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-semibold text-slate-700 border-b pb-2">Inhaladores Añadidos</h3>
                                            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                                {cartola.inhalers.map(inhaler => (
                                                    <li key={inhaler.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg shadow-sm">
                                                        <div>
                                                            <p className="font-bold text-purple-600 flex items-center gap-1">
                                                                {inhaler.isNewMedication && <StarIcon className="inline w-4 h-4 text-yellow-500" />}
                                                                {inhaler.doseIncreased && <ArrowUpIcon className="inline w-4 h-4" />}
                                                                {inhaler.doseDecreased && <ArrowDownIcon className="inline w-4 h-4" />}
                                                                {inhaler.requiresPurchase && <MoneyIcon className="inline w-4 h-4 text-green-600" />}
                                                                {inhaler.name} <span className="text-slate-600 font-normal">{inhaler.presentacion}</span>
                                                            </p>
                                                            <p className="text-sm text-slate-500">{`${inhaler.dose} puff(s) - cada ${inhaler.frequencyHours} h`}</p>
                                                            {inhaler.notes && <p className="text-xs text-slate-500 italic mt-1">Nota: {inhaler.notes}</p>}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => cartola.setEditingInhaler(inhaler)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors" aria-label="Editar inhalador">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21.036H3v-4.5L16.732 3.732z" /></svg>
                                                            </button>
                                                            <button onClick={() => cartola.removeInhaler(inhaler.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors" aria-label="Eliminar inhalador">
                                                                <TrashIcon className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <SuspensionSection controlInfo={cartola.controlInfo} onChange={cartola.handleControlChange} />
                    <div className="space-y-2 pt-4 border-t border-slate-200">
                        <label htmlFor="professional" className="block text-sm font-medium text-slate-600 mb-1">Profesional</label>
                        <input
                            type="text"
                            id="professional"
                            name="professional"
                            value={cartola.controlInfo.professional}
                            onChange={event => cartola.handleControlChange('professional', event.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <ControlInfoForm controlInfo={cartola.controlInfo} onChange={cartola.handleControlChange} />
                </div>

                <div className="bg-slate-200 p-4 sm:p-6 rounded-xl shadow-inner flex items-start justify-center overflow-x-auto">
                    <div className="w-full space-y-3">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600 print:hidden">
                            <input type="checkbox" className="rounded border-slate-300" checked={cartola.showCategoryLabels} onChange={event => cartola.setShowCategoryLabels(event.target.checked)} />
                            Mostrar etiquetas por tipo en la tabla imprimible
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600 print:hidden">
                            <input type="checkbox" className="rounded border-slate-300" checked={cartola.showIcons} onChange={event => cartola.setShowIcons(event.target.checked)} />
                            Mostrar "Iconos" (texto e íconos asociados)
                        </label>
                        <div ref={previewRef} className="w-full">
                            <SchedulePreview
                                patient={cartola.patient}
                                medications={cartola.medications}
                                injectables={cartola.injectables}
                                inhalers={cartola.inhalers}
                                controlInfo={cartola.controlInfo}
                                showQr={cartola.showQr}
                                showCategoryLabels={cartola.showCategoryLabels}
                                showIcons={cartola.showIcons}
                                onEditMedication={id => {
                                    const medication = cartola.medications.find(entry => entry.id === id);
                                    if (medication) {
                                        cartola.startEditingMedication(medication);
                                    }
                                }}
                                onEditInjectable={id => {
                                    const injectable = cartola.injectables.find(entry => entry.id === id);
                                    if (injectable) {
                                        cartola.startEditingInjectable(injectable);
                                    }
                                }}
                                onEditInhaler={id => {
                                    const inhaler = cartola.inhalers.find(entry => entry.id === id);
                                    if (inhaler) {
                                        cartola.startEditingInhaler(inhaler);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
