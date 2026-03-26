import React from 'react';
import AppModals from './AppModals';
import AppWorkspace from './AppWorkspace';
import {
    buildAppModalsProps,
    buildAppWorkspaceProps,
    type AppShellContentProps,
} from './appShellViewModel';

const AppShellContent: React.FC<AppShellContentProps> = props => {
    const modalProps = buildAppModalsProps(props);
    const workspaceProps = buildAppWorkspaceProps(props);

    return (
        <>
            <AppModals {...modalProps} />
            <AppWorkspace {...workspaceProps} />
            {props.panels.hhrModal}
        </>
    );
};

export default AppShellContent;
