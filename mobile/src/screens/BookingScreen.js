import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import Screen from '../components/Screen'
import SectionTitle from '../components/SectionTitle'
import Field from '../components/Field'
import PrimaryButton from '../components/PrimaryButton'
import { useCatalog } from '../CatalogContext'
import { createBooking } from '../api'
import { colors, radius, spacing } from '../theme'

export default function BookingScreen() {
  const { catalog } = useCatalog()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [service, setService] = useState(catalog.services[0]?.title || '')
  const [date, setDate] = useState('')
  const [request, setRequest] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const result = await createBooking({ name, email, service, date, request })
      Alert.alert('Booking sent', result.message)
      setName('')
      setEmail('')
      setDate('')
      setRequest('')
    } catch (error) {
      Alert.alert('Booking not sent', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <SectionTitle eyebrow="// Booking //" title="Book for a service" />
      <Text style={styles.lead}>Certified and award-winning car repair. Choose a service and send a request through the Django API.</Text>
      <Field label="Your name" value={name} onChangeText={setName} placeholder="Full name" />
      <Field label="Your email" value={email} onChangeText={setEmail} placeholder="name@email.com" keyboardType="email-address" autoCapitalize="none" />
      <Text style={styles.label}>Select a service</Text>
      <View style={styles.pills}>
        {catalog.services.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setService(item.title)}
            style={[styles.pill, service === item.title && styles.pillActive]}
          >
            <Text style={[styles.pillText, service === item.title && styles.pillTextActive]}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Service date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <Field label="Special request" value={request} onChangeText={setRequest} placeholder="Tell us what the car needs" multiline />
      <PrimaryButton label="Book now" onPress={submit} loading={loading} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  lead: {
    color: colors.muted,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.white,
  },
})
