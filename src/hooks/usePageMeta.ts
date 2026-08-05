import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildPageTitle, getScreenName } from '../utils/pageMeta';

export function usePageMeta() {
  const location = useLocation();

  useEffect(() => {
    const screenName = getScreenName(location.pathname);
    const pageTitle = buildPageTitle(screenName);
    const pagePath = location.pathname + location.hash;
    const pageLocation = window.location.href;

    document.title = pageTitle;

    const gtag = (window as any).gtag;
    gtag?.('event', 'page_view', {
      page_title: pageTitle,
      page_path: pagePath,
      page_location: pageLocation,
      screen_name: screenName,
    });
    gtag?.('event', 'screen_view', {
      screen_name: screenName,
      page_title: pageTitle,
    });
  }, [location]);
}