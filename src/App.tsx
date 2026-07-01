import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ComparisonsPage from './pages/ComparisonsPage'
import CarsPage from './pages/CarsPage'
import ComparisonDetailPage from './pages/ComparisonDetailPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ComparisonsPage />} />
          <Route path="cars" element={<CarsPage />} />
          <Route path="comparisons/:id" element={<ComparisonDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
