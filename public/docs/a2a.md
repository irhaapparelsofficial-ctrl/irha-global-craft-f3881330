# Irha Apparels Public A2A Agent

Agent Card: `https://irhaapparels.com/.well-known/agent-card.json`

Endpoint: `https://irhaapparels.com/a2a`

Protocol binding: JSON-RPC

A2A protocol version: `1.0`

Content type: `application/a2a+json`

## Purpose

The public A2A agent provides deterministic, read-only B2B buyer assistance. It can return public product links, buyer-trust and live factory video-call information, and a reviewable inquiry URL.

It does not submit buyer data, send email, publish social content, access CRM records or make commercial commitments.

## Request

Send JSON-RPC 2.0 requests with the `A2A-Version: 1.0` header.

```json
{
  "jsonrpc": "2.0",
  "id": "buyer-request-1",
  "method": "SendMessage",
  "params": {
    "message": {
      "messageId": "buyer-message-1",
      "role": "ROLE_USER",
      "parts": [
        {
          "text": "Show me your Bavarian apparel collections"
        }
      ]
    }
  }
}
```

The response contains a direct A2A `Message` with `ROLE_AGENT`. No task or private record is created.

## Supported operations

- `SendMessage`: accepts text-only buyer questions and returns a direct read-only message.
- `ListTasks`: returns an empty task list because this public agent does not persist tasks.
- `GetTask` and `CancelTask`: return `TaskNotFoundError` because no tasks are stored.

Streaming, push notifications and extended agent cards are explicitly unsupported and return the corresponding A2A error.

## Safety boundaries

- Maximum request body: 32 KB.
- Maximum processed buyer text: 4,000 characters.
- Only text parts are accepted.
- Buyer inquiry links are prepared for review; no form is submitted.
- Admin, CRM, outreach, social publishing and private files remain owner-only.
- MOQ, price, materials, production time, shipping and documents require Irha Apparels human confirmation.
