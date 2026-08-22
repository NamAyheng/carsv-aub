import { Image, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Screen from '../components/Screen'
import SectionTitle from '../components/SectionTitle'
import { useCatalog } from '../CatalogContext'
import { getImage } from '../images'
import { colors, radius, spacing } from '../theme'

export default function ServicesScreen() {
  const { catalog } = useCatalog()

  return (
    <Screen>
      <SectionTitle eyebrow="// Our Services //" title="Explore our services" />
      {catalog.services.map((service) => (
        <View key={service.id} style={styles.card}>
          <Image source={getImage(service.image)} style={styles.image} />
          <View style={styles.body}>
            <Text style={styles.title}>{service.title}</Text>
            <Text style={styles.summary}>{service.summary}</Text>
            {(service.points || []).map((point) => (
              <View key={point} style={styles.point}>
                <Ionicons name="checkmark" size={16} color={colors.success} />
                <Text style={styles.pointText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  image: {
    width: '100%',
    height: 170,
  },
  body: {
    padding: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 6,
  },
  summary: {
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pointText: {
    color: colors.secondary,
  },
})
