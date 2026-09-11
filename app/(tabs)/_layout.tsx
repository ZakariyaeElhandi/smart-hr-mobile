import { Tabs } from 'expo-router';
import { Clock, Calendar, FileText, TrendingUp } from 'lucide-react-native';
import { Theme } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: Theme.colors.border,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 8,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ma Présence',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="leaves"
        options={{
          title: 'Congés',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Mon Bilan',
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size || 22} />,
        }}
      />
    </Tabs>
  );
}
