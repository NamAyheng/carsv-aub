import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing } from '../theme'

export default function PrimaryButton({ label, onPress, disabled, loading, tone = 'primary' }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        tone === 'secondary' ? styles.secondary : styles.primary,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: colors.white,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
})
