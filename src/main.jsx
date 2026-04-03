import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import ScrollToTop from './components/ScrollToTop'
import './index.css'
import App from './App.jsx'

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
