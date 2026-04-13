import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean;
};

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setStatus({
        isConnected: Boolean(state.isConnected),
        isInternetReachable: state.isInternetReachable ?? Boolean(state.isConnected),
      });
    });
    return unsubscribe;
  }, []);

  return status;
}

