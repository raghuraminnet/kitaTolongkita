import * as WebBrowser from 'expo-web-browser';
import { exchangeCodeAsync, makeRedirectUri } from 'expo-auth-session';

// Google OAuth client config
// Register at: https://console.cloud.google.com/ → APIs & Services → Credentials
// Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in app.json (extra field)

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const REDIRECT_URI = makeRedirectUri({ scheme: 'com.kitatolongkita', path: 'oauth2redirect' });

export async function signInWithGoogle(): Promise<string | null> {
  try {
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'online');
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    const result = await WebBrowser.openBrowserAsync(googleAuthUrl.toString());

    // In Expo Go / development, the result has a `url` property with the redirect
    const resultAny = result as any;
    if (resultAny.url) {
      const url = new URL(resultAny.url);
      const code = url.searchParams.get('code');
      if (code) {
        const tokenResponse = await exchangeCodeAsync(
          {
            code,
            clientId: CLIENT_ID,
            redirectUri: REDIRECT_URI,
          },
          { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
        );
        return (tokenResponse as any).accessToken ?? null;
      }
    }
    return null;
  } catch (error) {
    console.error('Google sign-in error:', error);
    return null;
  }
}
