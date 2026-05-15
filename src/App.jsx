import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout/Layout.jsx'
import DashboardPage from './pages/DashboardPage/DashboardPage.jsx'
import CountryPage from './pages/CountryPage/CountryPage.jsx'
import ActorPage from './pages/ActorPage/ActorPage.jsx'
import OperationPage from './pages/OperationPage/OperationPage.jsx'
import ResearchPage from './pages/ResearchPage/ResearchPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage/AnalyticsPage.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'country/:id', element: <CountryPage /> },
      { path: 'actor/:id', element: <ActorPage /> },
      { path: 'operation/:id', element: <OperationPage /> },
      { path: 'research', element: <ResearchPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
