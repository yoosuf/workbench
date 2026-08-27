import React from 'react';
import { Flag, X, Check, ShieldCheck, Sparkles, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { useFeatureFlagsContext } from '../../context/FeatureFlagContext';

interface FeatureFlagsDevModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeatureFlagsDevModal: React.FC<FeatureFlagsDevModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { flagDetails, flags, setOverride, refetch, loading } = useFeatureFlagsContext();

  if (!isOpen) return null;

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'beta':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#a371f7]/20 text-[#a371f7] border border-[#a371f7]/30 flex items-center space-x-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>BETA</span>
          </span>
        );
      case 'security':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/30 flex items-center space-x-1">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>SECURITY</span>
          </span>
        );
      case 'collaboration':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30">
            TEAM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30">
            CORE
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-[#c9d1d9] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Enterprise Feature Flag Engine</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                  API & Client Sync
                </span>
              </h2>
              <p className="text-xs text-[#8b949e]">
                Dynamically toggle features, security safeguards, and beta capabilities in real-time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Flag List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {flagDetails.map((flag) => {
            const isChecked = flags[flag.key] ?? flag.enabled;
            return (
              <div
                key={flag.key}
                className="p-3.5 rounded-xl border border-[#30363d] bg-[#0d1117]/50 hover:bg-[#21262d]/40 transition-all flex items-start justify-between space-x-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-white text-xs">{flag.name}</span>
                    {getCategoryBadge(flag.category)}
                  </div>
                  <p className="text-[11px] text-[#8b949e] leading-snug mb-1.5">{flag.description}</p>
                  <code className="text-[10px] text-[#58a6ff] bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">
                    {flag.key}
                  </code>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => setOverride(flag.key, !isChecked)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isChecked ? 'bg-[#238636]' : 'bg-[#30363d]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isChecked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#30363d] bg-[#0d1117] flex items-center justify-between">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 text-xs text-[#8b949e] hover:text-[#58a6ff] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync with API</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
