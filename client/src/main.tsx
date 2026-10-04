import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './context/StoreContext';
import './style.css';
import './portable.css';

const root = document.getElementById('root');
if (!root) throw new Error('The application root is missing.');
createRoot(root).render(
  <StoreProvider>
    <App />
  </StoreProvider>,
);
