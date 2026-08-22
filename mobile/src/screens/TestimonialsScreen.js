import { Image, StyleSheet, Text, View } from 'react-native'
import Screen from '../components/Screen'
import SectionTitle from '../components/SectionTitle'
import { useCatalog } from '../CatalogContext'
import { getImage } from '../images'
import { colors, radius, spacing } from '../theme'

export default function TestimonialsScreen() {
  const { catalog } = useCatalog()

  return (
    <Screen>
      <SectionTitle eyebrow="// Testimonial //" title="Our clients say!" />
      {catalog.testimonials.map((item, index) => (
        <View key={item.id} style={[styles.card, index === 0 && styles.active]}>
          <Image source={getImage(item.image)} style={styles.avatar} />
          <Text style={[styles.name, index === 0 && styles.activeText]}>{item.name}</Text>
          <Text style={[styles.role, index === 0 && styles.activeText]}>{item.role}</Text>
          <Text style={[styles.quote, index === 0 && styles.activeText]}>{item.quote}</Text>
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  active: {
    backgroundColor: colors.primary,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing.sm,
  },
  name: {
    fontWeight: '700',
    color: colors.dark,
  },
  role: {
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  quote: {
    color: colors.secondary,
    textAlign: 'center',
  },
  activeText: {
    color: colors.white,
  },
})
