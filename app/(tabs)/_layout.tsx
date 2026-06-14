import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index"       options={{ title: 'Home',        tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }} />
      <Tabs.Screen name="collections" options={{ title: 'Collections', tabBarIcon: ({ color }) => <TabIcon icon="📚" color={color} /> }} />
      <Tabs.Screen name="upload"      options={{ title: 'Upload',      tabBarIcon: ({ color }) => <TabIcon icon="➕" color={color} /> }} />
      <Tabs.Screen name="progress"    options={{ title: 'Progress',    tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} /> }} />
      <Tabs.Screen name="settings"    options={{ title: 'Settings',    tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <>{icon}</>;
}
