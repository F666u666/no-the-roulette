import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MotionConfig } from 'motion/react';
import './styles/app.css';
import './styles/lobby.css';
import './styles/history.css';
import './styles/stage.css';
import './styles/home.css';
import './styles/art-direction.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>,
);
