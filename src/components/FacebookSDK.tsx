'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: any;
  }
}

export function FacebookSDK() {
  useEffect(() => {
    // Load Facebook SDK
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '778228344659402',
        cookie: true,
        xfbml: true,
        version: 'v23.0'
      });

      window.FB.AppEvents.logPageView();
    };

    // Load the SDK asynchronously
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  return <div id="fb-root"></div>;
}
