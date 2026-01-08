import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // App.jsx 파일 불러오기
import './index.css' // Tailwind 설정이 된 CSS 파일

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
