import { gql } from '@apollo/client';

export const GET_FEATURE_FLAGS_QUERY = gql`
  query GetFeatureFlags {
    featureFlags {
      key
      name
      description
      enabled
      category
    }
  }
`;

export const IS_FEATURE_ENABLED_QUERY = gql`
  query IsFeatureEnabled($key: String!) {
    isFeatureEnabled(key: $key)
  }
`;

export const SET_FEATURE_FLAG_OVERRIDE_MUTATION = gql`
  mutation SetFeatureFlagOverride($key: String!, $enabled: Boolean!) {
    setFeatureFlagOverride(key: $key, enabled: $enabled)
  }
`;
