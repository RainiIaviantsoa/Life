import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerStyle: { backgroundColor: Colors.bg1 }, headerTintColor: Colors.text }} />
      <View style={st.container}>
        <Text style={st.code}>404</Text>
        <Text style={st.title}>Page not found</Text>
        <Link href="/(tabs)/dashboard" asChild>
          <TouchableOpacity style={st.btn}>
            <Text style={st.btnLabel}>Go home</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  code: {
    fontSize: 72,
    fontWeight: '700',
    color: Colors.textMuted,
    lineHeight: 80,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
  },
  btn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.violet,
    borderRadius: 12,
  },
  btnLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
});
