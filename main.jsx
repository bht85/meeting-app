// 파일명: src/main.jsx (또는 src/index.js)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // 위에서 만든 App.jsx 파일을 불러옵니다.
import './index.css' // Tailwind CSS가 적용된 CSS 파일

// 핵심: HTML의 id="root" 인 곳에 App을 그려라!
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
