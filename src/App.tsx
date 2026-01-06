import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DealDetail from './pages/DealDetail'

function App() {
  return (
    <ToastProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/deals/:id" element={<DealDetail />} />
        </Routes>
      </Layout>
    </ToastProvider>
  )
}

export default App

