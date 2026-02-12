# Instagram Business Login Integration Guide

This document explains how to wire up **Instagram API with Instagram Login (Business Login)** so that Instagram Business or Creator accounts can authenticate with your app and grant the permissions required by the Instagram Graph API. It covers prerequisites, Meta App Dashboard configuration, OAuth implementation, review requirements, and operational best practices.

> **Reference:** [Meta Docs – Instagram API with Instagram Login (Business Login)](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login)

---

## 1. Terminology

| Term | Description |
| --- | --- |
| **Meta App** | The container you create in the Meta App Dashboard that holds credentials, products, and settings. |
| **Facebook Login** | Meta's OAuth 2.0 implementation that Instagram Business Login builds on. |
| **Instagram Graph API** | The API surface that exposes Instagram Business/Creator data after consent. |
| **App-Scoped User ID (ASID)** | The identifier returned after login that uniquely represents the Instagram account within your app. |
| **Long-Lived Token (LLT)** | An access token (60 days) required for server-to-server calls in production. |

---

## 2. Prerequisites

1. **Meta Developer Account** with access to the Meta App Dashboard.
2. **Instagram Business or Creator Account** connected to a **Facebook Page** via Meta Business Suite (Settings → Linked Accounts).
3. **Meta Business Account** that owns both the Facebook Page and Instagram account (recommended for production apps).
4. **Verified App Domain** and HTTPS redirect URI.
5. **Understanding of OAuth 2.0** and capability to securely store server-side secrets.
6. (Optional but recommended) Automated testing or staging environment with separate app credentials.

---

## 3. Create and Configure the Meta App

1. Navigate to the [Meta App Dashboard](https://developers.facebook.com/apps/) and choose **Create App**.
2. Select **Business** (recommended) or **None** as the app type. Business apps can request advanced Instagram permissions more easily.
3. Provide app name, contact email, and Business Manager (if applicable). Finish creation to land on the app's dashboard.
4. In the **Products** panel, add:
   - **Facebook Login** (required for Instagram Login)
   - **Instagram Graph API**
5. Under **App Settings → Basic** configure:
   - App domains (matching redirect URI domain)
   - Privacy Policy URL, Terms of Service URL
   - App icon and category (mandatory before sending for review)
   - Save changes.

---

## 4. Attach Instagram Accounts for Testing

1. In **Roles → Instagram Testers**, click **Add** and enter the Instagram handle of test users.
2. Each tester must accept the invite from within the Instagram mobile app (**Settings → Account → Browser Apps & Websites → Tester Invites**).
3. Ensure every tester account:
   - Is switched to Business or Creator mode.
   - Is linked to a Facebook Page that the tester can access.
   - Has at least one published media item (required for some endpoints).

> **Tip:** For local development, you can reuse the same app but keep it in Development Mode. Only testers will be able to log in until the app is made Live.

---

## 5. Configure Facebook Login (OAuth)

1. Navigate to **Products → Facebook Login → Settings**.
2. Configure the following:
   - **Valid OAuth Redirect URIs**: e.g., `https://yourapp.com/auth/instagram/callback`
   - **Login from Devices**: disable unless needed.
   - **Use Strict Mode for Redirect URIs**: enable for production.
   - **Enforce HTTPS**: enabled by default; keep on.
3. Under **App Settings → Advanced** confirm **Domain Whitelisting** if using App Links or deep links.
4. Optionally populate the **Deauthorize Callback URL** and **Data Deletion Callback URL** (required for review).

---

## 6. Implement the Business Login Flow

### 6.1. Build the Login Dialog URL

```text
GET https://www.facebook.com/v19.0/dialog/oauth
  ?client_id={APP_ID}
  &redirect_uri={REDIRECT_URI}
  &state={OPAQUE_VALUE}
  &scope=instagram_basic,instagram_manage_comments,pages_show_list
```

- **state** must be CSRF-protected data you validate on return.
- Include only the scopes you actually need. Common scopes:
  - `instagram_basic` (always required)
  - `pages_show_list` (needed to discover connected IG accounts)
  - `instagram_manage_comments`, `instagram_content_publish`, etc., depending on features.

### 6.2. Handle the Redirect

1. On success, Meta redirects to `{REDIRECT_URI}?code={AUTH_CODE}&state={STATE}`.
2. Validate `state`, then exchange `code` for a short-lived token:

```http
POST https://graph.facebook.com/v19.0/oauth/access_token
  ?client_id={APP_ID}
  &redirect_uri={REDIRECT_URI}
  &client_secret={APP_SECRET}
  &code={AUTH_CODE}
```

3. Response:

```json
{
  "access_token": "EAAG...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

### 6.3. Exchange for Long-Lived Token (Server-Side)

```http
GET https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}
```

Store the long-lived token securely with an expiration timestamp (≈60 days) and refresh it proactively.

### 6.4. Discover the Instagram Business Account

1. **Get the user's Pages**:

```http
GET https://graph.facebook.com/v19.0/me/accounts
  ?access_token={LLT}
```

2. For each page, request the linked IG account:

```http
GET https://graph.facebook.com/v19.0/{PAGE_ID}
  ?fields=instagram_business_account
  &access_token={LLT}
```

3. Use the returned `{INSTAGRAM_BUSINESS_ACCOUNT_ID}` (`ig_user_id`) to call Instagram Graph API endpoints, e.g.,

```http
GET https://graph.facebook.com/v19.0/{IG_USER_ID}
  ?fields=name,username,followers_count,media_count
  &access_token={LLT}
```

---

## 7. Permissions & App Review

1. **Development Mode:** Only app roles (admins, developers, testers) can log in.
2. **Before Review:** Implement data deletion callback, show in-app tooltips explaining why each permission is needed, and ensure the app is stable.
3. **Common permission bundles:**
   - Basic analytics: `instagram_basic`, `pages_show_list`.
   - Comment moderation: `instagram_manage_comments`, `pages_read_engagement`.
   - Publishing: `instagram_content_publish`, `instagram_basic`, `business_management`.
4. **Review Submission:** Provide a step-by-step screencast of the login plus feature usage. Include test credentials and staging URLs. Meta reviewers will reproduce the flow to ensure only requested scopes are used.

---

## 8. Production Checklist

- [ ] App status set to **Live**.
- [ ] Redirect URIs locked down and HTTPS-only.
- [ ] Secrets stored in a vault (not in client code or repos).
- [ ] Token refresh job scheduled (e.g., refresh every 45 days).
- [ ] Logging & monitoring for OAuth failures.
- [ ] Data handling complies with Meta Platform Terms and GDPR/CCPA requirements.
- [ ] User-facing data deletion instructions published and linked in the app.

---

## 9. Troubleshooting Tips

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `OAuthException: redirect_uri is not whitelisted` | Redirect URI mismatch | Add the exact URI to **Valid OAuth Redirect URIs**. |
| Login dialog hides Instagram option | Account is personal | Switch to Business/Creator and link to a Facebook Page. |
| `(#200) Permissions error` when calling `/me/accounts` | Missing `pages_show_list` scope | Re-run login requesting the scope; ensure it was approved. |
| Instagram account not returned | FB Page not linked | In Meta Business Suite, connect the IG account to the Page, or ensure the logged-in FB user manages that Page. |
| Token expires quickly | Using short-lived token | Exchange for a long-lived token and store server-side. |

---

## 10. Additional Resources

- [Instagram Graph API Getting Started](https://developers.facebook.com/docs/instagram-api/getting-started)
- [Facebook Login Security Best Practices](https://developers.facebook.com/docs/facebook-login/security)
- [App Review Submission Guide](https://developers.facebook.com/docs/app-review)
- [Data Deletion Callbacks](https://developers.facebook.com/docs/apps/review/guides/data-deletion)

By following this guide, you can reliably authenticate Instagram Business and Creator accounts via Instagram Login, uphold Meta's platform policies, and build secure integrations on top of the Instagram Graph API.
