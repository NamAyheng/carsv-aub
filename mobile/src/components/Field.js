import { StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, radius, spacing } from '../theme'

export default function Field({ label, ...props }) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && styles.multiline]}
        {...props}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    color: colors.dark,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
})
