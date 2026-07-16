import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const LS_KEY = 'sos-calc-dev-mode';

export function useDevMode(): boolean {
  const [searchParams] = useSearchParams();
  const isDevUrl = searchParams.get('mode') === 'dev';

  useEffect(() => {
    if (isDevUrl) {
      localStorage.setItem(LS_KEY, 'true');
    }
  }, [searchParams]);

  return localStorage.getItem(LS_KEY) === 'true' || isDevUrl;
}
