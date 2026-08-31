import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { Database, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { LOGIN_MUTATION } from '../graphql/auth';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [login, { loading }] = useMutation(LOGIN_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const res = await login({
        variables: {
          input: {
            email,
            password,
          },
        },
      });

      if (res.data?.login) {
        const { accessToken, user } = res.data.login;
        setAuth(accessToken, user);
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
        void navigate(from, { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1f6feb]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#58a6ff]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1f6feb] to-[#58a6ff] shadow-xl shadow-[#1f6feb]/25 mb-4 text-white">
            <Database className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Universal DB Workbench</h1>
          <p className="text-sm text-[#8b949e] mt-1">
            Enterprise multi-engine database management & schema analysis
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#161b22] rounded-2xl p-7 shadow-2xl border border-[#30363d] backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center justify-between">
            <span>Sign In</span>
            <span className="text-xs font-normal text-[#8b949e]">Single Account MVP</span>
          </h2>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-[#f85149]/10 border border-[#f85149]/30 flex items-start space-x-2.5 text-[#f85149] text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8b949e] absolute left-3.5 top-3" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@workbench.local"
                  className="pl-10 bg-[#0d1117] border-[#30363d]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8b949e] absolute left-3.5 top-3" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-[#0d1117] border-[#30363d]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all duration-150 flex items-center justify-center space-x-2 shadow-lg shadow-[#1f6feb]/25 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Workbench</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#30363d] text-center">
            <p className="text-xs text-[#8b949e]">
              Don&apos;t have an account yet?{' '}
              <Link to="/signup" className="text-[#58a6ff] hover:underline font-medium">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
