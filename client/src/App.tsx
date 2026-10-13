import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { ToastProvider } from './hooks/useToast';
import { BuyBoxProvider } from './hooks/useBuyBox';
import { LoadingState } from './components/States';
import { Dashboard } from './pages/Dashboard';
import { LeadResults } from './pages/LeadResults';

/**
 * Dashboard and Lead Results are the two screens a session starts on, so they
 * are in the main bundle. The rest are lazy — the Analytics page in particular
 * is rarely the first thing opened and need not be paid for on load.
 */
const BuyBoxPage = lazy(() => import('./pages/BuyBoxPage').then((m) => ({ default: m.BuyBoxPage })));
const Discovery = lazy(() => import('./pages/Discovery').then((m) => ({ default: m.Discovery })));
const LeadDetail = lazy(() => import('./pages/LeadDetail').then((m) => ({ default: m.LeadDetail })));
const SavedLeads = lazy(() => import('./pages/SavedLeads').then((m) => ({ default: m.SavedLeads })));
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <BuyBoxProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="leads" element={<LeadResults />} />
              <Route
                path="buy-box"
                element={<Suspense fallback={<LoadingState label="Loading Buy Box…" />}><BuyBoxPage /></Suspense>}
              />
              <Route
                path="discovery"
                element={<Suspense fallback={<LoadingState label="Loading discovery…" />}><Discovery /></Suspense>}
              />
              <Route
                path="leads/:id"
                element={<Suspense fallback={<LoadingState label="Loading lead…" />}><LeadDetail /></Suspense>}
              />
              <Route
                path="saved"
                element={<Suspense fallback={<LoadingState label="Loading saved leads…" />}><SavedLeads /></Suspense>}
              />
              <Route
                path="analytics"
                element={<Suspense fallback={<LoadingState label="Loading analytics…" />}><Analytics /></Suspense>}
              />
              <Route
                path="about"
                element={<Suspense fallback={<LoadingState label="Loading…" />}><About /></Suspense>}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BuyBoxProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
