import { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Screen from '../components/Screen'
import SectionTitle from '../components/SectionTitle'
import Field from '../components/Field'
import PrimaryButton from '../components/PrimaryButton'
import { useCatalog } from '../CatalogContext'
import { sendContact } from '../api'
import { colors, radius, spacing } from '../theme'

export default function ContactScreen() {
  const { catalog } = useCatalog()
  const { garage } = catalog
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const result = await sendContact({ name, email, subject, message })
      Alert.alert('Message sent', result.message)
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (error) {
      Alert.alert('Message not sent', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <SectionTitle eyebrow="// Contact Us //" title="Contact for any query" />
      <InfoRow icon="call-outline" text={garage.phone} />
      <InfoRow icon="mail-outline" text={garage.email} />
      <InfoRow icon="location-outline" text={garage.address} />
      <InfoRow icon="time-outline" text={garage.hours_weekday} />
      <Field label="Your name" value={name} onChangeText={setName} placeholder="Full name" />
      <Field label="Your email" value={email} onChangeText={setEmail} placeholder="name@email.com" keyboardType="email-address" autoCapitalize="none" />
      <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Subject" />
      <Field label="Message" value={message} onChangeText={setMessage} placeholder="Leave a message here" multiline />
      <PrimaryButton label="Send message" onPress={submit} loading={loading} />
    </Screen>
  )
}

function InfoRow({ icon, text }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  infoText: {
    color: colors.secondary,
    flex: 1,
  },
})
