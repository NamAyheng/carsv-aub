import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CatalogProvider } from './src/CatalogContext'
import RootNavigator from './src/navigation/RootNavigator'

export default function App() {
  return (
    <SafeAreaProvider>
      <CatalogProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </CatalogProvider>
    </SafeAreaProvider>
  )
}
