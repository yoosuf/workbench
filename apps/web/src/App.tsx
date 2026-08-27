import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { PublicRoute } from './routes/PublicRoute';
import { LoginPage } from './routes/LoginPage';
import { SignupPage } from './routes/SignupPage';
import { OverviewPage } from './routes/OverviewPage';
import { ConnectionsPage } from './routes/ConnectionsPage';
import { SchemaBrowserPage } from './routes/SchemaBrowserPage';
import { DiagramCanvasPage } from './routes/DiagramCanvasPage';
import { SqlEditorPage } from './routes/SqlEditorPage';
import { FeatureFlagProvider } from './context/FeatureFlagContext';
import { ThemeProvider } from './context/ThemeContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark">
      <FeatureFlagProvider>
        <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Protected workbench routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/schema" element={<SchemaBrowserPage />} />
          <Route path="/editor" element={<SqlEditorPage />} />
          <Route path="/diagram" element={<DiagramCanvasPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </FeatureFlagProvider>
    </ThemeProvider>
  );
};
