'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard write failed silently
    }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: '6px 12px',
        background: 'transparent',
        border: '1px solid #444444',
        borderRadius: '4px',
        color: copied ? '#4ade80' : '#aaaaaa',
        fontSize: '12px',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'color 0.15s',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}