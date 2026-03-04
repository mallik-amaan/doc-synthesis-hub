# Backend Polling Endpoint Implementation Prompt

## Task: Create a Real-Time Status Polling Endpoint

The frontend has been updated to support real-time status polling for document generation requests. Your task is to implement a corresponding endpoint on the backend that serves this polling mechanism.

## Frontend Implementation Details

**Polling Function (Client-side):**
```typescript
pollRequestStatus(
  requestId: string,
  onStatusChange: (status: RedactionStatusResponse) => void,
  interval: number = 3000, // Poll every 3 seconds
  maxAttempts: number = 0 // 0 = infinite polling
)
```
`
**Current Endpoint Being Polled:**
- Existing endpoint: `GET/POST /redaction_status/{requestId}` (from the HuggingFace API or your redaction service)
- This is called every 3 seconds to check for status updates
- Frontend already has: `getRedactionStatus(requestId)` function

## What You Need to Do

### Option 1: Enhance Existing Endpoint (Recommended)
Ensure your `/redaction_status/{requestId}` endpoint (or equivalent) returns:

```json
{
  "status": "string", // One of: pending, redacting, redacted, approved, generating, downloading, processing, ocr, handwriting, validation, zipping, uploading, completed, failed
  "message": "string (optional)",
  "files": ["array of file URLs (optional, for redacted documents)"],
  "progress": {
    "current": "number (0-100, optional)",
    "total": "number (optional)",
    "currentStep": "string (optional)"
  }
}
```

### Option 2: Create New Polling Endpoint (Alternative)
If you prefer a dedicated polling endpoint:

**Endpoint:** `GET /requests/{requestId}/poll-status`

**Response Format:**
```json
{
  "status": "string",
  "message": "string (optional)",
  "files": ["array of file URLs (optional)"],
  "progress": {
    "current": "number (0-100, optional)",
    "total": "number (optional)",
    "currentStep": "string (optional)"
  },
  "lastUpdated": "ISO timestamp (optional)"
}
```

### Option 3: WebSocket Implementation (Advanced)
For truly real-time updates without polling overhead:

**WebSocket Endpoint:** `WS /ws/requests/{requestId}/status`

**Message Format (Server to Client):**
```json
{
  "type": "status_update",
  "data": {
    "status": "string",
    "message": "string (optional)",
    "files": ["array of file URLs (optional)"],
    "progress": {
      "current": "number (0-100, optional)",
      "total": "number (optional)",
      "currentStep": "string (optional)"
    },
    "timestamp": "ISO timestamp"
  }
}
```

If implementing WebSocket, also update `DocumentService.tsx` to use a WebSocket connection instead of polling.

## Status Progression Order (for reference)

The statuses follow this progression order:
1. pending - Initial state (frontend creates)
2. redacting - (Legacy) Redaction process
3. redacted - (Legacy) Redacted state
4. approved - (Legacy) Approved state
5. generating - Calling LLM to generate document structure
6. downloading - Downloading/processing seed images
7. processing - General processing/setup
8. ocr - Running OCR on documents
9. handwriting - Generating handwritten text
10. validation - Validating ground truth
11. zipping - Creating ZIP archive
12. uploading - Uploading to Google Drive
13. completed - Successfully completed
14. failed - Failed with error

Terminal states (polling should stop):
- `completed`
- `failed`

## Implementation Checklist

- [ ] Endpoint returns all required fields (status, message, files if applicable)
- [ ] Status values match the progression order above
- [ ] Terminal states (completed/failed) are properly marked
- [ ] Error handling returns status 200 with `status: "failed"` and error message
- [ ] Response times are optimized (< 500ms preferred)
- [ ] Endpoint is accessible at the correct route
- [ ] (Optional) Add rate limiting to prevent excessive polling
- [ ] (Optional) Add WebSocket support for real-time updates

## Frontend Integration

Once implemented, the frontend will:
1. Make initial request to fetch status
2. Start polling every 3 seconds
3. Update UI immediately when status changes
4. Stop polling when `completed` or `failed` status is reached
5. Allow manual polling stop via cleanup function

The polling interval is currently set to 3000ms (3 seconds). This can be adjusted in `DocumentDetails.tsx` line where `pollRequestStatus` is called.

## Database/Cache Considerations

- Ensure status updates are persisted and accessible
- Consider caching frequently accessed request statuses
- Implement TTL for cached status entries if necessary
- Keep track of status transitions for audit/logging purposes

## Questions to Clarify

1. What's the current endpoint structure for checking redaction status?
2. Is there an existing database storing request statuses?
3. Should the endpoint include progress percentage when available?
4. Do you want to implement WebSocket later for more efficient updates?
5. Are there rate limiting requirements for polling?
