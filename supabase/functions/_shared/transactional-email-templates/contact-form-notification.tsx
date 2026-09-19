/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  subject?: string
  message?: string
}

const ContactFormNotification = ({ name, email, subject, message }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>New contact form submission from {name || 'a visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>KOREX INTELLIGENCE</Text></Section>
        <Heading style={h1}>New contact form submission</Heading>
        <Text style={label}>From</Text>
        <Text style={value}>{name} &lt;{email}&gt;</Text>
        <Text style={label}>Subject</Text>
        <Text style={value}>{subject}</Text>
        <Hr style={hr} />
        <Text style={label}>Message</Text>
        <Text style={messageStyle}>{message}</Text>
        <Hr style={hr} />
        <Text style={muted}>Reply directly to {email} to respond.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactFormNotification,
  subject: (data: Record<string, any>) =>
    `[Contact Form] ${data.subject || 'New message'} — from ${data.name || 'visitor'}`,
  displayName: 'Contact Form Notification',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Partnership',
    message: 'Hi — I would love to chat about a partnership opportunity.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 28px' }
const brand = { borderBottom: '2px solid #CC0000', paddingBottom: '14px', marginBottom: '32px' }
const brandText = { fontSize: '12px', fontWeight: '700', letterSpacing: '0.18em', color: '#CC0000', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 24px', letterSpacing: '-0.02em' }
const label = { fontSize: '11px', fontWeight: '700', letterSpacing: '0.12em', color: '#888', textTransform: 'uppercase' as const, margin: '16px 0 4px' }
const value = { fontSize: '15px', color: '#0a0a0a', margin: '0 0 8px', lineHeight: '1.5' }
const messageStyle = { fontSize: '15px', color: '#1a1a1a', margin: '0 0 8px', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const }
const hr = { border: 'none', borderTop: '1px solid #eee', margin: '24px 0' }
const muted = { fontSize: '13px', color: '#888', lineHeight: '1.5', margin: '8px 0 0' }
