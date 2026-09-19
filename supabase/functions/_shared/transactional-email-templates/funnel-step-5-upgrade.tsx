/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const APP_URL = 'https://korexintelligencesystems.com'

interface Props { name?: string }

const Step5Upgrade = ({ name }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Unlock unlimited strategies with Korex Pro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>DAY 10 · UPGRADE</Text></Section>
        <Heading style={h1}>Ready to take the training wheels off?</Heading>
        <Text style={lead}>{name ? `${name}, your` : 'Your'} Starter plan was designed to prove the value. If Korex earned its keep, Pro is where it actually replaces a marketing team.</Text>

        <Section style={proCard}>
          <Text style={proLabel}>KOREX PRO</Text>
          <Text style={proHeadline}>Unlimited strategies. Unlimited insights.</Text>
          <ul style={list}>
            <li style={listItem}>Unlimited 7 & 14 day strategy generations</li>
            <li style={listItem}>Unlimited analytics screenshot analysis</li>
            <li style={listItem}>Priority AI strategist with extended context</li>
            <li style={listItem}>Full media library &amp; content calendar</li>
            <li style={listItem}>Premium AI models for every workflow</li>
          </ul>
          <Section style={ctaWrap}>
            <Button href={`${APP_URL}/pricing`} style={button}>Upgrade to Pro</Button>
          </Section>
        </Section>

        <Text style={muted}>Not ready yet? No pressure. Korex stays useful on Starter — and I'll only email you when something material changes.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Step5Upgrade,
  subject: 'Unlock unlimited strategies with Korex Pro',
  displayName: 'Funnel · Step 5: Upgrade',
  previewData: { name: 'Jordan' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 28px' }
const brand = { borderBottom: '2px solid #CC0000', paddingBottom: '14px', marginBottom: '32px' }
const brandText = { fontSize: '12px', fontWeight: '700', letterSpacing: '0.18em', color: '#CC0000', margin: 0 }
const h1 = { fontSize: '28px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 16px', letterSpacing: '-0.02em' }
const lead = { fontSize: '16px', color: '#222', lineHeight: '1.55', margin: '0 0 28px' }
const proCard = { backgroundColor: '#0a0a0a', borderRadius: '14px', padding: '28px 24px', margin: '0 0 24px' }
const proLabel = { fontSize: '11px', fontWeight: '700', letterSpacing: '0.18em', color: '#CC0000', margin: '0 0 8px' }
const proHeadline = { fontSize: '20px', fontWeight: '700', color: '#ffffff', margin: '0 0 18px', lineHeight: '1.3' }
const list = { padding: '0 0 0 20px', margin: '0 0 22px', color: '#dcdcdc' }
const listItem = { fontSize: '14px', lineHeight: '1.7', color: '#dcdcdc' }
const ctaWrap = { margin: '8px 0 0' }
const button = { backgroundColor: '#CC0000', color: '#ffffff', padding: '14px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const muted = { fontSize: '13px', color: '#888', lineHeight: '1.5', margin: '0' }
