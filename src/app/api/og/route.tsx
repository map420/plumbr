import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title = searchParams.get('title') ?? 'WorkPilot — Contractor Business Software'
  const subtitle = searchParams.get('subtitle') ?? 'Estimates, invoices & job costing for contractors under $5M'
  const tag = searchParams.get('tag') ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0F2440 0%, #1E3A5F 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            right: '-120px',
            top: '-120px',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: 'rgba(249, 115, 22, 0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '60px',
            bottom: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(249, 115, 22, 0.05)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            padding: '60px 72px',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                background: '#F97316',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              🔧
            </div>
            <span style={{ color: 'white', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              WorkPilot
            </span>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
            {tag && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  borderRadius: '100px',
                  padding: '6px 16px',
                  width: 'fit-content',
                  color: '#F97316',
                  fontSize: '14px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {tag}
              </div>
            )}
            <h1
              style={{
                color: 'white',
                fontSize: title.length > 60 ? '42px' : '52px',
                fontWeight: '900',
                lineHeight: '1.1',
                letterSpacing: '-1px',
                margin: '0',
              }}
            >
              {title}
            </h1>
            <p
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '22px',
                lineHeight: '1.4',
                margin: '0',
                maxWidth: '700px',
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px' }}>
              workpilot.mrlabs.io
            </span>
            <div
              style={{
                background: '#F97316',
                color: 'white',
                fontSize: '15px',
                fontWeight: '700',
                padding: '10px 20px',
                borderRadius: '10px',
              }}
            >
              Start free trial →
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
