import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { useAuthStore } from '../stores/authStore';
import { REFRESH_TOKEN_MUTATION } from '../graphql/auth';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, accessToken, setAuth, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(!accessToken);
  const location = useLocation();

  const [refreshToken] = useMutation(REFRESH_TOKEN_MUTATION);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (accessToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await refreshToken();
        if (res.data?.refreshToken && isMounted) {
          setAuth(res.data.refreshToken.accessToken, res.data.refreshToken.user);
        } else {
          clearAuth();
        }
      } catch {
        if (isMounted) {
          clearAuth();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshToken, setAuth, clearAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#58a6ff] animate-spin" />
        <p className="text-xs text-[#8b949e] font-mono tracking-wider uppercase">
          Initializing Workbench Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="h-screen w-screen bg-[#0d1117] flex overflow-hidden select-none font-sans text-[#c9d1d9]">
      {/* Universal Left Sidebar with Live Status & Bottom Logout */}
      <Sidebar />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
        <Navbar />
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
