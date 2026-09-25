import { Tabs } from "expo-router";
import { Image, Text } from "react-native";
import { colors, fonts } from "@/lib/theme";

// Intrinsic size of assets/logo-white.png — used to keep the header mark's
// aspect ratio correct at a fixed display height.
const LOGO_RATIO = 2434 / 528;
const LOGO_HEIGHT = 24;

function HeaderLogo() {
  return (
    <Image
      source={require("../../../assets/logo-white.png")}
      resizeMode="contain"
      style={{ height: LOGO_HEIGHT, width: LOGO_HEIGHT * LOGO_RATIO }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink },
        headerTitle: () => <HeaderLogo />,
        headerTitleAlign: "center",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "My Bookings",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text>,
        }}
      />
      <Tabs.Screen
        name="pbs"
        options={{
          title: "PBs",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏆</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
