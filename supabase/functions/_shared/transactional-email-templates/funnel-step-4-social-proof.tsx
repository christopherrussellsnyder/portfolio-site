/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const APP_URL = 'https://korexintelligencesystems.com'

interface Props { name?: string }

const Step4Social = ({ name }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>How operators are using Korex right now</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>DAY 7 · IN PRACTICE</Text></Section>
        <Heading style={h1}>What it looks like when it clicks.</Heading>
        <Text style={text}>{name ? `${name}, ` : ''}three patterns we keep seeing from teams getting outsized results with Korex:</Text>

        <Section style={quote}>
          <Text style={quoteText}>"Replaced a $4k/mo agency. The strategies are sharper because Korex actually reads my analytics."</Text>
          <Text style={quoteAttr}>— Founder, DTC skincare brand</Text>
        </Section>
        <Section style={quote}>
          <Text style={quoteText}>"We generate a 14-day plan every other Friday. My team executes against it. That's the whole workflow now."</Text>
          <Text style={quoteAttr}>— Head of marketing, B2B SaaS</Text>
        </Section>
        <Section style={quote}>
          <Text style={quoteText}>"The screenshot analysis is unfair. I drop in last week's reach and it tells me exactly what to change."</Text>
          <Text style={quoteAttr}>— Solo creator, 80k followers</Text>
        </Section>

        <Section style={ctaWrap}>
          <Button href={`${APP_URL}/insights`} style={button}>Try analytics insights</Button>
        </Section>
        <Text style={muted}>One more email coming — and it's the one with the offer worth reading.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Step4Social,
  subject: 'How operators are using Korex right now',
  displayName: 'Funnel · Step 4: Social proof',
  previewData: { name: 'Jordan' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 28px' }
const brand = { borderBottom: '2px solid #CC0000', paddingBottom: '14px', marginBottom: '32px' }
const brandText = { fontSize: '12px', fontWeight: '700', letterSpacing: '0.18em', color: '#CC0000', margin: 0 }
const h1 = { fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 16px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 24px' }
const quote = { borderLeft: '3px solid #CC0000', padding: '4px 0 4px 18px', margin: '0 0 22px' }
const quoteText = { fontSize: '15px', color: '#222', lineHeight: '1.55', fontStyle: 'italic' as const, margin: '0 0 6px' }
const quoteAttr = { fontSize: '13px', color: '#777', margin: 0 }
const ctaWrap = { margin: '28px 0 0' }
const button = { backgroundColor: '#CC0000', color: '#ffffff', padding: '14px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const muted = { fontSize: '13px', color: '#888', lineHeight: '1.5', margin: '24px 0 0' }
