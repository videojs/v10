import { createRoot } from 'react-dom/client';

import { Player } from './player';

import './style.css';

const root = document.querySelector('#app');
if (!root) throw new Error('Could not find the application root.');

createRoot(root).render(<Player />);
