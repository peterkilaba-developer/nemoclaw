import ReactDOM from 'react-dom/client'
import './index.css'
import ScrollToTop from './components/ScrollToTop';
import App from './App';
import { StrictMode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

console.log('MAIN.JSX BOOTSTRAPPING');

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
