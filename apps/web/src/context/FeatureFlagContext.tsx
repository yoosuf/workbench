import React, { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_FEATURE_FLAGS_QUERY,
  SET_FEATURE_FLAG_OVERRIDE_MUTATION,
} from '../graphql/feature-flags';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  flagDetails: FeatureFlag[];
  loading: boolean;
  isEnabled: (key: string) => boolean;
  setOverride: (key: string, enabled: boolean) => Promise<void>;
  refetch: () => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, loading, refetch } = useQuery(GET_FEATURE_FLAGS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const [setFlagMutation] = useMutation(SET_FEATURE_FLAG_OVERRIDE_MUTATION);

  const flagDetails: FeatureFlag[] = data?.featureFlags || [];

  const flags = useMemo(() => {
    const map: Record<string, boolean> = {
      EER_DIAGRAM_DESIGNER: true,
      SQL_QUERY_EXPORT: true,
      TRANSACTIONAL_NOTIFICATIONS: true,
      TEAM_COLLABORATION: true,
      CONNECTION_SSL_ENFORCEMENT: true,
      AI_QUERY_ASSIST: false,
      TABLE_DATA_VIRTUALIZATION: true,
    };
    if (flagDetails.length > 0) {
      flagDetails.forEach((f) => {
        map[f.key] = f.enabled;
      });
    }
    return map;
  }, [flagDetails]);

  const isEnabled = (key: string): boolean => {
    return flags[key] ?? true;
  };

  const setOverride = async (key: string, enabled: boolean) => {
    await setFlagMutation({ variables: { key, enabled } });
    void refetch();
  };

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        flagDetails,
        loading,
        isEnabled,
        setOverride,
        refetch,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlag = (key: string): boolean => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    return true; // Safe default
  }
  return context.isEnabled(key);
};

export const useFeatureFlagsContext = (): FeatureFlagContextValue => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlagsContext must be used within a FeatureFlagProvider');
  }
  return context;
};

export const FeatureGate: React.FC<{
  flag: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ flag, fallback = null, children }) => {
  const enabled = useFeatureFlag(flag);
  if (!enabled) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
