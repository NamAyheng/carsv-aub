import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme'

export default function SectionTitle({ eyebrow, title }) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: colors.dark,
    fontSize: 26,
    fontWeight: '700',
  },
})
