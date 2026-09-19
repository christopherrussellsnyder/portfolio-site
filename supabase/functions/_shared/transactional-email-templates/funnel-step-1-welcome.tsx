/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Korex Intelligence'
const APP_URL = 'https://korexintelligencesystems.com'

interface Props { name?: string }

const Step1Welcome = ({ name }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Welcome to {SITE_NAME} — your AI marketing co-pilot is live</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>KOREX INTELLIGENCE</Text></Section>
        <Heading style={h1}>Welcome{name ? `, ${name}` : ''}.</Heading>
        <Text style={lead}>You just unlocked an AI strategist trained on what actually moves the needle on social.</Text>
        <Text style={text}>Over the next few days I'll send you 5 short emails that walk you through how top operators use Korex to ship strategies in minutes — not weeks.</Text>
        <Section style={ctaWrap}>
          <Button href={`${APP_URL}/ai-strategist`} style={button}>Open your strategist</Button>
        </Section>
        <Text style={muted}>You'll hear from me again in 2 days with the features that drive 80% of the value.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Step1Welcome,
  subject: 'Welcome to Korex Intelligence',
  displayName: 'Funnel · Step 1: Welcome',
  previewData: { name: 'Jordan' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 28px' }
const brand = { borderBottom: '2px solid #CC0000', paddingBottom: '14px', marginBottom: '32px' }
const brandText = { fontSize: '12px', fontWeight: '700', letterSpacing: '0.18em', color: '#CC0000', margin: 0 }
const h1 = { fontSize: '28px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 16px', letterSpacing: '-0.02em' }
const lead = { fontSize: '17px', color: '#1a1a1a', lineHeight: '1.5', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 28px' }
const ctaWrap = { margin: '0 0 32px' }
const button = { backgroundColor: '#CC0000', color: '#ffffff', padding: '14px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const muted = { fontSize: '13px', color: '#888', lineHeight: '1.5', margin: '24px 0 0' }
