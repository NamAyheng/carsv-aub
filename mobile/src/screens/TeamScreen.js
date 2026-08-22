import { Image, StyleSheet, Text, View } from 'react-native'
import Screen from '../components/Screen'
import SectionTitle from '../components/SectionTitle'
import { useCatalog } from '../CatalogContext'
import { getImage } from '../images'
import { colors, radius, spacing } from '../theme'

export default function TeamScreen() {
  const { catalog } = useCatalog()

  return (
    <Screen>
      <SectionTitle eyebrow="// Our Technicians //" title="Expert technicians" />
      <View style={styles.grid}>
        {catalog.team.map((member) => (
          <View key={member.id} style={styles.card}>
            <Image source={getImage(member.image)} style={styles.image} />
            <View style={styles.body}>
              <Text style={styles.name}>{member.name}</Text>
              <Text style={styles.role}>{member.role}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
  },
  body: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  name: {
    fontWeight: '700',
    color: colors.dark,
  },
  role: {
    color: colors.muted,
    fontSize: 12,
  },
})
