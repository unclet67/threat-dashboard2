import { useState, useCallback } from 'react'
import Anthropic from '@anthropic-ai/sdk'

const STORAGE_KEY = 'iw-research-chat-history'

function buildSystemPrompt(kb) {
  const actorNames = kb.actors.map(a => a.name).join(', ')
  const opCount = kb.operations.length
  return `You are an Information Warfare intelligence analyst assistant. You help research IO and Cyberspace Operations conducted by China, Russia, Iran, and North Korea.

Current knowledge base: ${kb.actors.length} threat actors (${actorNames}), ${opCount} documented operations.

When asked about threat actors or operations:
1. Structure your response around the Diamond Model: Adversary, Capability, Infrastructure, Victim.
2. Always cite sources (reports, government advisories, academic papers) with URLs where available.
3. Include MITRE ATT&CK technique IDs (e.g. T1566, T1190) when describing capabilities.
4. Distinguish between Information Operations (influence, disinformation, psyops) and Cyberspace Operations (intrusion, disruption, espionage).
5. State your confidence level: high (multiple corroborating sources), medium (limited sourcing), low (assessed/inferred).

When you identify a discrete operation or update to an actor profile, end your response with a structured JSON block wrapped in <KB_ENTITY> tags so the analyst can save it:
<KB_ENTITY>
{"type": "operation", "data": { ...operation fields following the schema }}
</KB_ENTITY>`
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

function saveHistory(messages) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
}

export function useClaudeResearch(kb) {
  const [messages, setMessages] = useState(loadHistory)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const sendMessage = useCallback(async (userText, contextChips = []) => {
    const contextNote = contextChips.length > 0
      ? `[Context: ${contextChips.join(', ')}]\n\n` : ''
    const userMessage = { role: 'user', content: contextNote + userText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    saveHistory(newMessages)
    setLoading(true)
    setError(null)

    try {
      const client = new Anthropic({
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      })
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: buildSystemPrompt(kb),
        messages: newMessages,
      })
      const assistantMessage = { role: 'assistant', content: response.content[0].text }
      const updated = [...newMessages, assistantMessage]
      setMessages(updated)
      saveHistory(updated)
      return assistantMessage.content
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [messages, kb])

  function clearHistory() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  function extractKbEntity(assistantText) {
    const match = assistantText.match(/<KB_ENTITY>([\s\S]*?)<\/KB_ENTITY>/)
    if (!match) return null
    try { return JSON.parse(match[1].trim()) }
    catch { return null }
  }

  return { messages, loading, error, sendMessage, clearHistory, extractKbEntity }
}
