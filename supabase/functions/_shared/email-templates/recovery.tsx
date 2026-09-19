/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://yxpzkcqeqzpgysvrrezc.supabase.co/storage/v1/object/public/email-assets/korex-wordmark-lockup.png'

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for Korex Intelligence Systems</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="240" height="69" alt="Korex Intelligence Systems" style={logo} />
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for Korex Intelligence Systems. Click the button below to choose a new password.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Reset Password
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { margin: '0 auto' }
const divider = { borderColor: '#e5e5e5', margin: '0 0 32px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0b', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4a4a4f', lineHeight: '1.6', margin: '0 0 20px' }
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const button = {
  backgroundColor: '#CC0000',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#999999', margin: '32px 0 0', lineHeight: '1.5' }
