import React from 'react';
import { TEMPLATES } from '../../constants';
import { CalendarPlusIcon } from '../icons';

interface HeaderTemplateControlsProps {
    templateId: string;
    onTemplateChange: (id: string) => void;
    onAddClinicalUpdateSection: () => void;
}

const HeaderTemplateControls: React.FC<HeaderTemplateControlsProps> = ({
    templateId,
    onTemplateChange,
    onAddClinicalUpdateSection,
}) => (
    <div className="topbar-group topbar-group-templates">
        <select
            className="topbar-template-select"
            value={templateId}
            onChange={event => onTemplateChange(event.target.value)}
        >
            {Object.values(TEMPLATES).map(template => (
                <option key={template.id} value={template.id}>
                    {template.name}
                </option>
            ))}
        </select>
        <button
            type="button"
            className="template-update-btn"
            onClick={onAddClinicalUpdateSection}
            title="Agregar actualización clínica"
        >
            <CalendarPlusIcon />
        </button>
    </div>
);

export default HeaderTemplateControls;
