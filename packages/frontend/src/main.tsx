import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Ensure React Query devtools are available in development
if (process.env.NODE_ENV === 'development') {
  // Import React Query DevTools only in development
  import('@tanstack/react-query-devtools').then(() => {
    console.log('React Query DevTools loaded')
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
) 