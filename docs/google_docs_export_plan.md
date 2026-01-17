# Implementation Plan: Google Docs Export

**Date**: 2026-01-17
**Objective**: Add Google Docs export functionality for interviews
**Target Page**: `/interview/[id]` (interview view page)

## Context

Currently, the `/interview/[id]` page allows exporting an interview to PDF via the "Exporter" button. The export generates a PDF using Playwright (Chromium) server-side in `/api/interviews/export/route.ts`.

### Architecture Decisions

Based on user requirements:
- **Authentication**: Separate Google OAuth (Google login only at export time)
- **UX**: Separate "Exporter vers Google Docs" button next to existing PDF button - use a Lucide icon

## Technical Overview

### User Flow

**First time user (never authorized the app before):**
1. User clicks "Exporter vers Google Docs" on interview page
2. Redirected to Google consent screen
3. Google shows: "Allow [Your App] to access your Google Docs and Drive?"
4. User clicks "Allow" (no password entry needed if already logged into Google)
5. Redirected back to interview page
6. Google Docs document created with interview content
7. Document opens in new tab

**Returning user (previously authorized, token still valid):**
1. User clicks "Exporter vers Google Docs"
2. Brief redirect to Google (may be invisible, just a flash)
3. Document created immediately
4. Document opens in new tab

**Returning user (token expired after 1 hour):**
1. User clicks "Exporter vers Google Docs"
2. May see Google consent screen again (or just flash redirect if permissions cached)
3. Document created
4. Document opens in new tab

**Key UX Points:**
- Users already logged into Google in their browser won't need to enter password
- First authorization requires explicit consent (clicking "Allow")
- Subsequent exports may be seamless or require re-consent depending on Google's session state
- Our 1hr cookie expiry means users may need to re-authorize after that time

### Tech Stack

- **Google APIs Client**: `googleapis` npm package
- **OAuth 2.0**: Google OAuth with redirect flow (popup or new window)
- **Output Format**: Google Docs API to create and format document
- **Session**: Temporary OAuth token storage (not in DB for now)

## Detailed Architecture

### 1. Google Cloud Configuration

**Files affected**:
- `.env.local.example` (new variables)
- `.env.local` (local only)

**Manual steps**:
1. Create Google Cloud Console project
2. Enable Google Docs API and Google Drive API
3. Create OAuth 2.0 credentials (Web application)
4. Configure authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (dev)
   - `https://[your-domain]/api/auth/google/callback` (prod)
5. Obtain Client ID and Client Secret

**Environment variables to add**:
```bash
# Google OAuth for Docs Export
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### 2. npm Dependencies

**File**: `package.json`

**Add**:
```json
{
  "dependencies": {
    "googleapis": "^140.0.0"
  }
}
```

### 3. OAuth Callback API Route

**New file**: `src/app/api/auth/google/callback/route.ts`

**Responsibility**:
- Receive OAuth authorization code from Google
- Exchange code for access token
- Store token in secure cookie (httpOnly, secure in prod)
- Redirect to original page with success indicator

**Pattern**:
```typescript
// Pseudo-code
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // contains interviewId

  // Exchange code for token
  const { access_token, refresh_token } = await exchangeCodeForToken(code);

  // Store in secure cookie
  const response = NextResponse.redirect(`/interview/${state}?oauth=success`);
  response.cookies.set("google_access_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600, // 1 hour
  });

  return response;
}
```

### 4. OAuth Authorization API Route

**New file**: `src/app/api/auth/google/authorize/route.ts`

**Responsibility**:
- Generate Google OAuth authorization URL
- Include necessary scopes (docs, drive.file)
- Pass interviewId in `state` parameter to return to correct page
- Set `prompt` parameter appropriately:
  - `prompt=consent` forces consent screen every time (more secure but annoying)
  - `prompt=select_account` lets user choose account if multiple Google accounts
  - Omitting `prompt` gives best UX: consent only on first auth, seamless after

**Pattern**:
```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const interviewId = searchParams.get("interviewId");

  const authUrl = generateGoogleAuthUrl({
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive.file"
    ],
    state: interviewId, // To return to correct page
    // Do NOT set prompt parameter - let Google decide based on session state
    // This gives best UX: consent on first use, seamless after
  });

  return NextResponse.redirect(authUrl);
}
```

### 5. Google Docs Export API Route

**New file**: `src/app/api/interviews/export-google-docs/route.ts`

**Responsibility**:
- Verify valid Google token exists (cookie)
- Fetch interview data (same logic as PDF export)
- Create Google Docs document via API
- Format content (title, metadata, messages)
- Return created document URL

**Data to include** (same as PDF):
- Title: "Entretien avec [Agent] par [User] le [Date]"
- Metadata: date, session ID, user email, agent description
- Interview messages (user/assistant)
- System prompt (optional, as appendix)

**Pattern**:
```typescript
export async function POST(req: NextRequest) {
  // 1. Verify OAuth token
  const accessToken = req.cookies.get("google_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Not authenticated with Google", requiresAuth: true },
      { status: 401 }
    );
  }

  // 2. Fetch interview data (same code as PDF export)
  const { interviewId } = await req.json();
  const interviewData = await fetchInterviewData(interviewId);

  // 3. Create Google Docs document
  const docs = google.docs({ version: "v1", auth: oAuth2Client });
  const doc = await docs.documents.create({
    requestBody: {
      title: `Entretien avec ${interviewData.agentName} - ${date}`,
    },
  });

  // 4. Insert formatted content
  await docs.documents.batchUpdate({
    documentId: doc.data.documentId,
    requestBody: {
      requests: buildDocumentRequests(interviewData),
    },
  });

  // 5. Return document URL
  return NextResponse.json({
    documentUrl: `https://docs.google.com/document/d/${doc.data.documentId}/edit`,
    documentId: doc.data.documentId,
  });
}
```

### 6. Client Component for Button

**File to modify**: `src/app/interview/[id]/page.tsx`

**Changes**:

1. **Additional state**:
```typescript
const [isExportingGoogleDocs, setIsExportingGoogleDocs] = useState(false);
const [googleDocsUrl, setGoogleDocsUrl] = useState<string | null>(null);
```

2. **Google Docs export handler**:
```typescript
const handleExportGoogleDocs = async () => {
  if (!interviewId) return;
  setIsExportingGoogleDocs(true);

  try {
    const response = await fetch("/api/interviews/export-google-docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewId }),
    });

    if (response.status === 401) {
      const data = await response.json();
      if (data.requiresAuth) {
        // Redirect to OAuth
        window.location.href = `/api/auth/google/authorize?interviewId=${interviewId}`;
        return;
      }
    }

    if (!response.ok) {
      throw new Error("Export failed");
    }

    const { documentUrl } = await response.json();
    setGoogleDocsUrl(documentUrl);

    // Open in new tab
    window.open(documentUrl, "_blank");

    // Optional: Success toast
    // toast({ title: "Document créé", description: "Votre entretien a été exporté vers Google Docs" });
  } catch (error) {
    console.error("Export Google Docs error:", error);
    // Error toast
  } finally {
    setIsExportingGoogleDocs(false);
  }
};
```

3. **UI - Add button to header** (line 404-413):
```tsx
<HStack justify="space-between" align="center">
  <Heading as="h1" size="lg">
    {/* ... existing title ... */}
  </Heading>
  <HStack gap={2}>
    <Button
      size="sm"
      variant="outline"
      onClick={handleExportPdf}
      loading={isExporting}
      disabled={!interviewSummary || !user || !interviewId}
      paddingInline={4}
    >
      Exporter PDF
    </Button>
    <Button
      size="sm"
      variant="outline"
      colorPalette="blue"
      onClick={handleExportGoogleDocs}
      loading={isExportingGoogleDocs}
      disabled={!interviewSummary || !user || !interviewId}
      paddingInline={4}
    >
      Exporter vers Google Docs
    </Button>
  </HStack>
</HStack>
```

### 7. Shared Utilities

**New file**: `src/lib/googleDocs.ts`

**Contents**:
- `buildDocumentRequests()`: Generate content insertion requests for Google Docs API
- `formatInterviewForGoogleDocs()`: Transform interview data into Google Docs structure
- Helpers for formatting messages, metadata, etc.

**Google Docs formatting pattern**:
```typescript
export function buildDocumentRequests(data: InterviewData) {
  const requests = [];
  let index = 1; // Position index in document

  // Main title
  requests.push({
    insertText: {
      location: { index },
      text: `Entretien avec ${data.agentName}\n`,
    },
  });

  // Title formatting (bold, size)
  requests.push({
    updateTextStyle: {
      range: { startIndex: 1, endIndex: text.length + 1 },
      textStyle: { bold: true, fontSize: { magnitude: 18, unit: "PT" } },
      fields: "bold,fontSize",
    },
  });

  // ... messages, metadata, etc.

  return requests;
}
```

### 8. Error Handling and Edge Cases

**Scenarios to handle**:

1. **Expired token**:
   - Detect 401 error from Google API
   - Clear cookie
   - Redirect to OAuth

2. **Insufficient scope**:
   - Clear message for user
   - Option to re-authorize with correct scopes

3. **Google API quota exceeded**:
   - Explicit error message
   - Suggest waiting or downloading PDF instead

4. **Network errors**:
   - Retry logic (optional)
   - User-friendly error message

## Critical Files to Create/Modify

### New Files
1. `src/app/api/auth/google/authorize/route.ts` - OAuth initiation
2. `src/app/api/auth/google/callback/route.ts` - OAuth callback
3. `src/app/api/interviews/export-google-docs/route.ts` - Google Docs export
4. `src/lib/googleDocs.ts` - Google Docs API utilities

### Files to Modify
1. `src/app/interview/[id]/page.tsx` - Add button and handler
2. `package.json` - Add `googleapis`
3. `.env.local.example` - Document Google variables

## Dependencies and Prerequisites

### Manual configuration required
- [ ] Create Google Cloud Console project
- [ ] Enable Google Docs API and Google Drive API
- [ ] Create OAuth 2.0 credentials
- [ ] Configure redirect URIs
- [ ] Add environment variables

### Installation
```bash
npm install googleapis
```

## Testing and Verification

### End-to-end manual test
1. Navigate to `/interview/[id]` for existing interview
2. Click "Exporter vers Google Docs"
3. Verify redirect to Google OAuth (popup or new window)
4. Accept Google permissions
5. Verify redirect back to interview page
6. Verify Google Docs document creation
7. Verify document contains:
   - Correct title
   - Metadata (date, user, agent)
   - All messages in correct order
   - Proper formatting (bold for authors, etc.)
   - System prompt as appendix

### Edge case tests
- [ ] Click export without Google authentication
- [ ] Expired token (wait 1h or manually invalidate)
- [ ] Interrupted OAuth flow (close popup)
- [ ] Interview with no messages
- [ ] Special characters in content

### Technical tests
- [ ] Verify token not exposed client-side
- [ ] Verify secure cookies (httpOnly, secure in prod)
- [ ] Test across browsers (Chrome, Firefox, Safari)
- [ ] Verify blocked popup behavior

## Security Considerations

1. **OAuth Tokens**:
   - Stored in httpOnly cookies
   - Short lifetime (1h)
   - Never exposed to client JavaScript
   - Refresh token stored securely (optional for v1)

2. **CSRF Protection**:
   - Use `state` parameter in OAuth flow
   - Verify state at callback

3. **Validation**:
   - Verify user has access to interview
   - Same permission logic as PDF export

4. **Rate limiting**:
   - Consider server-side limiting (optional for v1)
   - Monitor Google API quotas

## Future Improvements (out of scope v1)

1. **Refresh token**: Store refresh token in DB to avoid re-authentication
2. **Customizable template**: Allow teachers to define format
3. **Batch export**: Export multiple interviews into single document
4. **Auto-sharing**: Automatically share doc with teacher
5. **Granular permissions**: Choose between "view only" and "comment"
6. **Format conversion**: .docx export option without Google account

## Estimated Timeline (no code yet)

1. Google Cloud configuration + env vars
2. Install dependencies
3. OAuth routes (authorize + callback)
4. Google Docs export route
5. UI integration (button + handler)
6. Formatting utilities
7. Testing and validation
8. Documentation

## Important Notes

- OAuth token stored in cookie, **not in database** for v1
- User must re-authenticate each session (no refresh token in v1)
- Created document will belong to authenticated Google user
- No need to activate Supabase Storage for this feature
- PDF export remains available and unchanged
- **All development communication in English**
