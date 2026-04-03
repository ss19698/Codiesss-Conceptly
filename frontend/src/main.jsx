import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181f',
            color: '#e8e8f0',
            border: '1px solid #252535',
            borderRadius: '12px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#4ef0b8', secondary: '#09090f' } },
          error:   { iconTheme: { primary: '#f772c0', secondary: '#09090f' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)