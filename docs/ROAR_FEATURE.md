# ROAR Feature Deep-Dive

## Overview

ROAR (Real Operator Assisted Routing) is the voice calling infrastructure in the bolt platform that connects real estate agents with their broker team.

## Components

### Frontend Components

| Component | Path | Purpose |
|---|---|---|
| `MultipleAgentCallonTransaction` | `src/components/Roar/MultipleAgentCallonTransaction.tsx` | Entry point on transaction detail page |
| `CallModal` | `src/components/Roar/CallModal.tsx` | Old ROAR modal (BETTER_CALL_FLOWS=OFF) |
| `CallModalForm` | `src/components/Roar/CallModalForm.tsx` | Form inside old ROAR modal |
| `NeoLeoBrokerTrigger` | `src/components/...` | Intercepts button click when BETTER_CALL_FLOWS=ON |
| `ParticipantsResourceTable` | `src/components/Roar/ParticipantsResourceTable.tsx` | Broker view: select participant to call |

### API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/voice/calls` | POST | Create a voice call (old flow) |
| `/api/v1/leo/chat/sessions` | POST | Create Leo chat session (new flow) |
| `/api/v1/leo/chat/:id/stream` | GET | Stream Leo response |
| `/api/v1/voice/calls/:id/sms-dial-number` | GET | SMS the dial number to agent |

### Create Voice Call Payloads

**Agent → Broker Team:**
```json
{
  "containerId": "<transactionId>",
  "containerType": "Transaction",
  "targetId": "<groupId>",
  "targetType": "Group"
}
```

**Broker → Agent:**
```json
{
  "containerId": "<transactionId>",
  "containerType": "Transaction",
  "targetId": "<agentYentaId>",
  "targetType": "User",
  "callerGroupId": "<groupId>"
}
```

## Flow: BETTER_CALL_FLOWS=ON (team2 default)

```
Agent on Transaction Page
  └─ Clicks "Call Broker Team" button
       └─ NeoLeoBrokerTrigger detects isBrokerSupportThroughLeoEnabled=true
            └─ POST /api/v1/leo/chat/sessions  ← leoChatSessionCreate
                 └─ NeoLeo panel slides in (mini panel)
                      └─ Transaction auto-selected (selector hidden)
                      └─ Agent types question → Submit
                           └─ GET /api/v1/leo/chat/:id/stream  ← leoChatStream
                                └─ Leo responds with broker suggestion
                                     └─ "Connect with Broker" button appears
                                          └─ Agent clicks → broker details shown
                                               └─ brokerDetailsDiv visible
                                               └─ brokerNameBadge visible
                                               └─ brokerPhoneNumber visible
```

## Flow: BETTER_CALL_FLOWS=OFF (old flow)

```
Agent on Transaction Page
  └─ Clicks "Call Broker Team" button
       └─ POST /api/v1/voice/calls  ← createCalls
            └─ CallModal opens
                 └─ Shows virtualNumber + callCode
                 └─ Optional: "Text Me This Number"
                       └─ GET /api/v1/voice/calls/:id/sms-dial-number
```

## VoiceCallDto Response

```typescript
interface VoiceCallDto {
  id: string;
  virtualNumber: string;   // The number the agent dials
  callCode: string;        // PIN to enter
  dialNumber: string;      // Formatted dial number
  status: string;
}
```
