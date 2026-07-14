import { useSearchParams } from 'react-router-dom';

export function useDevMode(): boolean {
  const [searchParams] = useSearchParams();
  return searchParams.get('mode') === 'dev';
}
