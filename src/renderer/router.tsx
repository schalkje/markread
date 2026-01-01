/**
 * React Router Configuration
 * T014: Configure react-router-dom for tab navigation
 */

import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import AppLayout from './components/AppLayout';

// T014: Using memory router for Electron (not browser history)
const router = createMemoryRouter([
  {
    path: '/',
    element: <AppLayout />,
  },
  {
    path: '/tab/:tabId',
    element: <AppLayout />,
  },
]);

export default router;

// Export RouterProvider wrapper component
export function Router() {
  return <RouterProvider router={router} />;
}
