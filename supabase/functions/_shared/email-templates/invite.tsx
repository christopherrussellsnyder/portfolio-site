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
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

const LOGO_URL = 'https://yxpzkcqeqzpgysvrrezc.supabase.co/storage/v1/object/public/email-assets/korex-wordmark-lockup.png'

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join Korex Intelligence Systems</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="240" height="69" alt="Korex Intelligence Systems" style={logo} />
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>Korex Intelligence Systems</strong>
          </Link>
          . Click the button below to accept the invitation and create your account.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation
          </Button>
        </Section>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { margin: '0 auto' }
const divider = { borderColor: '#e5e5e5', margin: '0 0 32px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0b', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4a4a4f', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#CC0000', textDecoration: 'underline' }
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
