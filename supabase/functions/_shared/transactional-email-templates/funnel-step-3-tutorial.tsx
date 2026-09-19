/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const APP_URL = 'https://korexintelligencesystems.com'

interface Props { name?: string }

const Step3Tutorial = ({ name }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Generate your first strategy in 90 seconds</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>DAY 4 · QUICK START</Text></Section>
        <Heading style={h1}>Your first strategy, in 90 seconds.</Heading>
        <Text style={text}>{name ? `${name}, h` : 'H'}ere's the fastest path from signup to a usable content plan.</Text>

        <Section style={step}><Text style={stepNum}>1</Text><Text style={stepText}>Open <strong>AI Strategist</strong> and drop in your website URL. Korex will scrape and learn your brand voice.</Text></Section>
        <Section style={step}><Text style={stepNum}>2</Text><Text style={stepText}>Click <strong>Generate Strategy</strong> and pick 7 or 14 days. Answer 5 quick questions.</Text></Section>
        <Section style={step}><Text style={stepNum}>3</Text><Text style={stepText}>Korex outputs a full plan with captions, hooks, hashtags and optimal post times — ready to copy or schedule.</Text></Section>

        <Section style={ctaWrap}>
          <Button href={`${APP_URL}/ai-strategist`} style={button}>Generate my strategy</Button>
        </Section>
        <Text style={muted}>Heads up: your Starter plan includes 2 strategy generations. Use them on your highest-leverage campaigns.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Step3Tutorial,
  subject: 'Generate your first strategy in 90 seconds',
  displayName: 'Funnel · Step 3: Tutorial',
  previewData: { name: 'Jordan' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 28px' }
const brand = { borderBottom: '2px solid #CC0000', paddingBottom: '14px', marginBottom: '32px' }
const brandText = { fontSize: '12px', fontWeight: '700', letterSpacing: '0.18em', color: '#CC0000', margin: 0 }
const h1 = { fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 16px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 24px' }
const step = { display: 'block', padding: '14px 0', borderBottom: '1px solid #eee' }
const stepNum = { display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px', textAlign: 'center' as const, backgroundColor: '#CC0000', color: '#fff', borderRadius: '50%', fontSize: '13px', fontWeight: '700', margin: '0 12px 0 0', verticalAlign: 'top' as const }
const stepText = { display: 'inline-block', width: 'calc(100% - 50px)', fontSize: '14px', color: '#222', lineHeight: '1.5', margin: 0, verticalAlign: 'top' as const }
const ctaWrap = { margin: '28px 0 0' }
const button = { backgroundColor: '#CC0000', color: '#ffffff', padding: '14px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const muted = { fontSize: '13px', color: '#888', lineHeight: '1.5', margin: '24px 0 0' }
