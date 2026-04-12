'use server'
// Server Actions for container lifecycle mutations.
// Server Actions run on the server and can be called directly from Client Components
// using form actions or event handlers. They replace what would otherwise be a
// separate mutation API — so no extra Route Handler needed
// Each action calls the Pi agent and returns a typed result so the client can
// show success/error feedback without a full page reload.

import { agentFetch } from '@/lib/agent'
import type { ActionType, Deployment } from '@/types/service'

interface ActionResult {
  success: boolean
  deployment: Deployment | null
  error?: string
}

async function triggerAction(serviceId: string, action: ActionType): Promise<ActionResult> {
  try {
    const deployment = await agentFetch<Deployment>(`/services/${serviceId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
    return { success: true, deployment }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, deployment: null, error: message }
  }
}

export async function restartService(serviceId: string): Promise<ActionResult> {
  return triggerAction(serviceId, 'restart')
}

export async function stopService(serviceId: string): Promise<ActionResult> {
  return triggerAction(serviceId, 'stop')
}

export async function startService(serviceId: string): Promise<ActionResult> {
  return triggerAction(serviceId, 'start')
}

export async function pullAndRecreateService(serviceId: string): Promise<ActionResult> {
  return triggerAction(serviceId, 'recreate')
}
