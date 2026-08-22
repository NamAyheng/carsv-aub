import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Screen from '../components/Screen'
import SectionTitle from '../components/SectionTitle'
import PrimaryButton from '../components/PrimaryButton'
import { useCatalog } from '../CatalogContext'
import { getImage } from '../images'
import { colors, radius, spacing } from '../theme'

export default function HomeScreen({ navigation }) {
  const { catalog, apiOnline } = useCatalog()
  const { garage, features, services } = catalog

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Ionicons name="car-sport" size={22} color={colors.white} />
        </View>
        <Text style={styles.brand}>{garage.name}</Text>
        <View style={[styles.badge, apiOnline ? styles.online : styles.offline]}>
          <Text style={styles.badgeText}>{apiOnline ? 'API ON' : 'OFFLINE'}</Text>
        </View>
      </View>

      <ImageBackground source={getImage('carousel-bg-1.jpg')} style={styles.hero} imageStyle={styles.heroImage}>
        <View style={styles.heroShade}>
          <Text style={styles.heroEyebrow}>// Car Servicing //</Text>
          <Text style={styles.heroTitle}>{garage.tagline}</Text>
          <Text style={styles.heroText}>{garage.about}</Text>
          <PrimaryButton label="Book a service" onPress={() => navigation.navigate('Book')} />
        </View>
      </ImageBackground>

      <SectionTitle eyebrow="// Why CarSV //" title="Trusted auto care" />
      {features.map((feature) => (
        <View key={feature.id} style={styles.feature}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          <View style={styles.featureCopy}>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        </View>
      ))}

      <SectionTitle eyebrow="// Our Services //" title="Explore our work" />
      {services.slice(0, 3).map((service) => (
        <Pressable key={service.id} style={styles.serviceCard} onPress={() => navigation.navigate('Services')}>
          <Image source={getImage(service.image)} style={styles.serviceImage} />
          <View style={styles.serviceCopy}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.serviceText}>{service.summary}</Text>
          </View>
        </Pressable>
      ))}

      <View style={styles.row}>
        <Pressable style={styles.linkCard} onPress={() => navigation.navigate('About')}>
          <Text style={styles.linkTitle}>About us</Text>
          <Text style={styles.linkText}>{garage.years_experience} years experience</Text>
        </Pressable>
        <Pressable style={styles.linkCard} onPress={() => navigation.navigate('Testimonials')}>
          <Text style={styles.linkTitle}>Reviews</Text>
          <Text style={styles.linkText}>What clients say</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brand: {
    flex: 1,
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  online: {
    backgroundColor: colors.success,
  },
  offline: {
    backgroundColor: colors.muted,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  hero: {
    minHeight: 280,
    marginBottom: spacing.lg,
  },
  heroImage: {
    borderRadius: radius.lg,
  },
  heroShade: {
    flex: 1,
    backgroundColor: 'rgba(11, 33, 84, 0.78)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  heroEyebrow: {
    color: colors.white,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroText: {
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.md,
  },
  feature: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 10,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureText: {
    color: colors.muted,
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  serviceImage: {
    width: '100%',
    height: 140,
  },
  serviceCopy: {
    padding: spacing.md,
  },
  serviceTitle: {
    color: colors.dark,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 4,
  },
  serviceText: {
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  linkCard: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  linkTitle: {
    color: colors.white,
    fontWeight: '700',
    marginBottom: 4,
  },
  linkText: {
    color: colors.white,
    opacity: 0.85,
  },
})
