import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <View style={st.container}>
      <Text style={st.title}>Modal</Text>
      <StatusBar style="light" />
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
  },
});
