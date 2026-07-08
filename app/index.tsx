import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding, useColors } from '../src/hooks';

export default function Index() {
  const router = useRouter();
  const colors = useColors();
  const { hasCompleted } = useOnboarding();

  useEffect(() => {
    if (hasCompleted === null) return;

    if (hasCompleted) {
      router.replace('/main');
    } else {
      router.replace('/onboarding');
    }
  }, [hasCompleted, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.greenDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
