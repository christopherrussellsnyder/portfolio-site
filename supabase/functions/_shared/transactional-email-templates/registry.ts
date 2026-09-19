/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as funnelStep1 } from './funnel-step-1-welcome.tsx'
import { template as funnelStep2 } from './funnel-step-2-features.tsx'
import { template as funnelStep3 } from './funnel-step-3-tutorial.tsx'
import { template as funnelStep4 } from './funnel-step-4-social-proof.tsx'
import { template as funnelStep5 } from './funnel-step-5-upgrade.tsx'
import { template as contactFormNotification } from './contact-form-notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'funnel-step-1-welcome': funnelStep1,
  'funnel-step-2-features': funnelStep2,
  'funnel-step-3-tutorial': funnelStep3,
  'funnel-step-4-social-proof': funnelStep4,
  'funnel-step-5-upgrade': funnelStep5,
  'contact-form-notification': contactFormNotification,
}
