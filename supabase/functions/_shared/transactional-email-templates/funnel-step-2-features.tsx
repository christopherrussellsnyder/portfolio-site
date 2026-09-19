/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const APP_URL = 'https://korexintelligencesystems.com'

interface Props { name?: string }

const Step2Features = ({ name }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>The 3 Korex features that do 80% of the work</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>DAY 2 · CORE FEATURES</Text></Section>
        <Heading style={h1}>The 3 things to try first{name ? `, ${name}` : ''}.</Heading>
        <Text style={text}>Most users hit their "aha moment" inside these three workflows. Pick whichever one matches what you need this week.</Text>

        <Section style={card}>
          <Text style={cardLabel}>01 · STRATEGY GENERATION</Text>
          <Text style={cardText}>Tell Korex about your business and get a complete 7 or 14 day content strategy across every platform — captions, hooks, posting times.</Text>
        </Section>
        <Section style={card}>
          <Text style={cardLabel}>02 · ANALYTICS INSIGHTS</Text>
          <Text style={cardText}>Drop in a screenshot of any platform's analytics and Korex extracts what's working, what's bombing, and what to do next.</Text>
        </Section>
        <Section style={card}>
          <Text style={cardLabel}>03 · AI STRATEGIST CHAT</Text>
          <Text style={cardText}>Ask anything: "What should I post tomorrow?" "Why is my reach down?" — grounded in your actual business context.</Text>
        </Section>

        <Section style={ctaWrap}>
          <Button href={`${APP_URL}/ai-strategist`} style={button}>Try the strategist</Button>
        </Section>
        <Text style={muted}>Tomorrow I'll send a quick walkthrough of how to set up your first strategy in under 90 seconds.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Step2Features,
  subject: 'The 3 Korex features that do 80% of the work',
  displayName: 'Funnel · Step 2: Features',
  previewData: { name: 'Jordan' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 28px' }
const brand = { borderBottom: '2px solid #CC0000', paddingBottom: '14px', marginBottom: '32px' }
const brandText = { fontSize: '12px', fontWeight: '700', letterSpacing: '0.18em', color: '#CC0000', margin: 0 }
const h1 = { fontSize: '26px', fontWeight: '700', color: '#0a0a0a', margin: '0 0 16px', letterSpacing: '-0.02em' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 24px' }
const card = { backgroundColor: '#f7f7f8', borderLeft: '3px solid #CC0000', padding: '16px 18px', borderRadius: '8px', margin: '0 0 14px' }
const cardLabel = { fontSize: '11px', fontWeight: '700', letterSpacing: '0.14em', color: '#CC0000', margin: '0 0 6px' }
const cardText = { fontSize: '14px', color: '#222', lineHeight: '1.5', margin: 0 }
const ctaWrap = { margin: '28px 0 0' }
const button = { backgroundColor: '#CC0000', color: '#ffffff', padding: '14px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const muted = { fontSize: '13px', color: '#888', lineHeight: '1.5', margin: '24px 0 0' }
