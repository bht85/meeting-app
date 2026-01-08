import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Tailwind CSS가 있다면 유지, 없다면 삭제

// index.html의 id="root"를 찾아서 App 컴포넌트를 집어넣습니다.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
