import { siteConfig } from '@/lib/config'

export function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'WorkPilot',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        description: siteConfig.description,
        url: `${siteConfig.url}/en`,
        offers: {
          '@type': 'Offer',
          price: '49',
          priceCurrency: 'USD',
          priceValidUntil: '2027-12-31',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '500',
          bestRating: '5',
        },
      },
      {
        '@type': 'Organization',
        name: 'WorkPilot',
        url: siteConfig.url,
        logo: `${siteConfig.url}/icons/icon-512.png`,
        contactPoint: {
          '@type': 'ContactPoint',
          email: siteConfig.email,
          contactType: 'customer support',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Do I need a credit card to start the trial?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No credit card required. Start your 14-day free trial instantly.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is WorkPilot only for plumbers?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No, WorkPilot is built for all types of contractors: plumbers, electricians, roofers, HVAC, landscapers, general contractors and more.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does it integrate with QuickBooks?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'QuickBooks integration is on our roadmap. Currently, you can export reports and invoices.',
            },
          },
          {
            '@type': 'Question',
            name: 'How long does setup take?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Most contractors are up and running in under 5 minutes. No training required.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I cancel anytime?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, you can cancel anytime with no penalties or hidden fees.',
            },
          },
        ],
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
