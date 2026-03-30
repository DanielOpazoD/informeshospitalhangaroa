import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoot from './components/app/AppRoot';

const App: React.FC = () => (
    <BrowserRouter>
        <AppRoot />
    </BrowserRouter>
);

export default App;
