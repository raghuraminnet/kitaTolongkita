import { Alert } from 'react-native';

export function requireAuth(
  user: any,
  navigation: any,
  actionDescription: string,
  onAuthorized: () => void | Promise<void>
): boolean {
  if (!user) {
    Alert.alert(
      'Sign In Required',
      `Please log in or create an account to ${actionDescription}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => navigation.navigate('Login') },
        { text: 'Sign Up', onPress: () => navigation.navigate('SignUp') },
      ]
    );
    return false;
  }
  onAuthorized();
  return true;
}
