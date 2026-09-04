import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/ui';

const ICON = 24;

/**
 * Icono de pestaña con indicador activo: una pastilla periwinkle suave detrás
 * del icono cuando la pestaña está seleccionada. Va DENTRO del hueco del icono,
 * así que nunca recorta la etiqueta de debajo.
 */
function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: ColorValue;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} color={color} size={ICON} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.primary,
        tabBarInactiveTintColor: '#8A879B',
        // IMPORTANTE: con Android edge-to-edge (siempre activo en SDK 57) la barra
        // se dibuja detrás de la navegación del sistema. Hay que sumar insets.bottom
        // a la altura y al padding inferior. Y NO usar `overflow: hidden` en el
        // item: recorta la etiqueta.
        tabBarStyle: {
          backgroundColor: tokens.color.surfaceSolid,
          borderTopColor: 'rgba(107,124,255,0.24)',
          borderTopWidth: 2,
          height: 66 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + 6,
          elevation: 18,
          shadowColor: '#463C82',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.16,
          shadowRadius: 28,
        },
        tabBarLabelStyle: {
          fontFamily: tokens.font.family.sansBold,
          fontSize: 11,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Radar',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="radio-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Mis planes',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Crear',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="add-circle-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: tokens.color.primarySoft,
  },
});
