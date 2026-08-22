import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, StyleSheet, View } from 'react-native'
import { colors, spacing } from '../theme'

export default function Screen({ children, scroll = true }) {
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.light,
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 36,
  },
})
