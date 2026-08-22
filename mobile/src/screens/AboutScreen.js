import { Image, StyleSheet, Text, View } from 'react-native'
import Screen from '../components/Screen'
import SectionTitle from '../components/SectionTitle'
import { useCatalog } from '../CatalogContext'
import { getImage } from '../images'
import { colors, radius, spacing } from '../theme'

export default function AboutScreen() {
  const { catalog } = useCatalog()
  const { garage, features } = catalog

  return (
    <Screen>
      <SectionTitle eyebrow="// About Us //" title={`${garage.name} is the best place for your auto care`} />
      <Image source={getImage('about.jpg')} style={styles.image} />
      <View style={styles.years}>
        <Text style={styles.yearsNumber}>{garage.years_experience}</Text>
        <Text style={styles.yearsLabel}>Years experience</Text>
      </View>
      <Text style={styles.about}>{garage.about}</Text>
      {features.map((feature, index) => (
        <View key={feature.id} style={styles.row}>
          <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
          <View>
            <Text style={styles.title}>{feature.title}</Text>
            <Text style={styles.text}>{feature.text}</Text>
          </View>
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 210,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  years: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  yearsNumber: {
    color: colors.white,
    fontSize: 36,
    fontWeight: '800',
  },
  yearsLabel: {
    color: colors.white,
  },
  about: {
    color: colors.muted,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  index: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 18,
  },
  title: {
    color: colors.secondary,
    fontWeight: '700',
  },
  text: {
    color: colors.muted,
  },
})
