import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import HomeScreen from '../screens/HomeScreen'
import ServicesScreen from '../screens/ServicesScreen'
import BookingScreen from '../screens/BookingScreen'
import TeamScreen from '../screens/TeamScreen'
import ContactScreen from '../screens/ContactScreen'
import AboutScreen from '../screens/AboutScreen'
import TestimonialsScreen from '../screens/TestimonialsScreen'
import { colors } from '../theme'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#8A93A6',
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Services: 'construct',
            Book: 'calendar',
            Team: 'people',
            Contact: 'call',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Book" component={BookingScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
      <Tab.Screen name="Contact" component={ContactScreen} />
    </Tab.Navigator>
  )
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.secondary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About Us' }} />
        <Stack.Screen name="Testimonials" component={TestimonialsScreen} options={{ title: 'Testimonials' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
