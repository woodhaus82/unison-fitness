import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors, fonts } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        headerTitleStyle: { fontFamily: fonts.heading, fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Schedule",
          headerTitle: "Schedule",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "My Bookings",
          headerTitle: "My Bookings",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text>,
        }}
      />
      <Tabs.Screen
        name="pbs"
        options={{
          title: "PBs",
          headerTitle: "PBs",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏆</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerTitle: "Profile",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
