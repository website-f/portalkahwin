import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import AppRouter from './AppRouter';

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <AppRouter />
    </StrictMode>
);
