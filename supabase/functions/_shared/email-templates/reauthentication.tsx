/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://yxpzkcqeqzpgysvrrezc.supabase.co/storage/v1/object/public/email-assets/korex-wordmark-lockup.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for Korex Intelligence Systems</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="240" height="69" alt="Korex Intelligence Systems" style={logo} />
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { margin: '0 auto' }
const divider = { borderColor: '#e5e5e5', margin: '0 0 32px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0b', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4a4a4f', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: "'SF Mono', 'Monaco', 'Courier', monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#CC0000',
  margin: '8px 0 32px',
  letterSpacing: '4px',
}
const footer = { fontSize: '13px', color: '#999999', margin: '32px 0 0', lineHeight: '1.5' }
