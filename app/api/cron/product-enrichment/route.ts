import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PRICING_SCHEMA = {
  type: 'object' as const,
  properties: {
    found: { type: 'boolean' as const },
    pricing: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          period:   { type: 'string' as const, enum: ['monthly', 'annual', 'quarterly', 'weekly', 'semiannual'] },
          price:    { type: 'number' as const },
          currency: { type: 'string' as const },
        },
        required: ['period', 'price', 'currency'],
        additionalProperties: false,
      },
    },
  },
  required: ['found', 'pricing'],
  additionalProperties: false,
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, website')
    .eq('enrichment_status', 'pending')
    .not('website', 'is', null)
    .limit(10)

  if (error || !products?.length) {
    return NextResponse.json({ enriched: 0, failed: 0 })
  }

  let enriched = 0
  let failed = 0

  for (const product of products) {
    try {
      const url = `https://${product.website}/pricing`
      let pageText: string | null = null

      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SubSounder/1.0; +https://subsounder.com)' },
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) {
          const html = await res.text()
          pageText = stripHtml(html)
        }
      } catch {
        // fetch failed — mark for Firecrawl fallback (future enhancement)
      }

      if (!pageText || pageText.length < 100) {
        await supabase
          .from('products')
          .update({ enrichment_status: 'fetch_failed' })
          .eq('id', product.id)
        failed++
        continue
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'pricing_extraction',
            strict: true,
            schema: PRICING_SCHEMA,
          },
        },
        messages: [
          {
            role: 'system',
            content:
              'Extract subscription pricing tiers from the pricing page text. Return each tier as {period, price, currency}. Supported periods: monthly, annual, quarterly, weekly, semiannual. If no clear pricing is found, return found=false and pricing=[].',
          },
          {
            role: 'user',
            content: pageText.slice(0, 8000),
          },
        ],
      })

      const result = JSON.parse(completion.choices[0].message.content ?? '{}') as {
        found: boolean
        pricing: Array<{ period: string; price: number; currency: string }>
      }

      await supabase
        .from('products')
        .update({
          pricing: result.pricing.length > 0 ? result.pricing : null,
          enrichment_status: result.found ? 'enriched' : 'no_pricing_found',
          enriched_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      enriched++
    } catch (err) {
      console.error(`[product-enrichment] failed for product ${product.id} (${product.website}):`, err)
      await supabase
        .from('products')
        .update({ enrichment_status: 'fetch_failed' })
        .eq('id', product.id)
      failed++
    }
  }

  return NextResponse.json({ enriched, failed })
}
