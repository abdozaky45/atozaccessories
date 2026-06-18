# AUTH_SPEC.md

Authentication specification for the **A to Z Accessory** backend (Express + TypeScript + MongoDB/Mongoose, JWT-based).

> Note: This project is the **backend API**. The endpoints below are what a frontend would call. Paths are relative to the API base URL.

---

## 1. Auth Endpoints

All auth endpoints live under the `/authentication` router ([src/Router/Authentication/AuthRouter.ts](src/Router/Authentication/AuthRouter.ts)) and are **public** (no token required). Logout lives under the authenticated `/user` router.

### 1.1 POST `/authentication/register-email`

Single entry point for both first-time registration and admin login-code requests. Behavior branches on whether the email exists and the user's role.

- **Auth required:** No
- **Validation:** `{ email }` required ([AuthValidation.AuthValidationEmail](src/Validation/User/Auth/AuthValidation.ts))
- **Request body:**
  ```json
  { "email": "user@example.com" }
  ```
- **Responses (depends on account state):**

  | Case | Status | Body | Message |
  |------|--------|------|---------|
  | Email not found → new account created (role defaults to `user`), welcome email sent | `201` | `{}` | `"User created successfully"` |
  | Email exists & role = `admin` → OTP generated + emailed | `200` | `{ "email": "..." }` | `"OTP sent successfully"` |
  | Email exists & role = `user` → welcome email resent | `200` | `{}` | `"email sent successfully"` |
  | Email send failed (admin branch) | error | — | `"EMAIL_NOT_SENT"` |

  Standard success envelope ([ApiResponse](src/Utils/ErrorHandling)):
  ```json
  { "statusCode": 200, "data": { ... }, "message": "..." , "success": true }
  ```

### 1.2 POST `/authentication/active-account`

Verifies the 6-digit OTP and issues a JWT access token. **Admin only.**

- **Auth required:** No (but enforces `role === admin`)
- **Validation:** `{ email, activeCode }` both required ([AuthValidation.activeAccount](src/Validation/User/Auth/AuthValidation.ts))
- **Request body:**
  ```json
  { "email": "admin@example.com", "activeCode": "123456" }
  ```
- **Success response — `200`:**
  ```json
  {
    "statusCode": 200,
    "data": { "accessToken": "<JWT>" },
    "message": "account activated successfully",
    "success": true
  }
  ```
- **Error responses:**

  | Condition | Status | Message |
  |-----------|--------|---------|
  | Email not found | `400` | `EMAIL_NOT_FOUND` |
  | Role is not `admin` | `403` | `ROLE_ERROR` |
  | Code older than 15 minutes | `400` | `ACTIVE_CODE_EXPIRED` |
  | Code does not match (bcrypt compare) | `400` | `ACTIVE_CODE_NOT_MATCH` |

  On success: sets `isConfirmed = true`, `status = Online`, deletes `activeCode`/`codeCreatedAt`, signs a 7-day JWT (`{ _id, role, email }`), and persists the token in `TokenModel` with the request `user-agent`.

### 1.3 POST `/authentication/email-new-code`

Re-issues a fresh OTP for an existing admin. **Admin only.**

- **Auth required:** No (enforces `role === admin`)
- **Validation:** `{ email }` required
- **Request body:**
  ```json
  { "email": "admin@example.com" }
  ```
- **Success response — `200`:** `{}` with message `"email sent successfully"`
- **Errors:** `400 EMAIL_NOT_FOUND` if no user; `403 ROLE_ERROR` if not admin; error if email send fails.

### 1.4 POST `/user/logout`

Invalidates the current session token. ([src/Router/User/UserRouter.ts](src/Router/User/UserRouter.ts), [UserController.logout](src/Controller/User/UserController.ts))

- **Auth required:** Yes — `Authorization: Bearer <token>`, role `admin` or `user`
- **Request body:** none (uses `currentUser` injected by middleware)
- **Behavior:** sets user `status = Offline`, deletes the matching token doc, clears `refreshToken` cookie.
- **Success — `200`:** `{}` message `"Logout successful"`
- **Error:** `400 TOKEN_NOT_FOUND` if token doc missing.

### 1.5 Disabled / commented-out (phone auth — not active)

In [AuthRouter.ts](src/Router/Authentication/AuthRouter.ts) the following are commented out and **not currently mounted**:
- `POST /authentication/register-phone`
- `POST /authentication/phone-new-code`

Supporting helpers exist (`findUserByPhone`, `RequiredUniquePhone` schema, SNS `SendSMS`) but the routes are inactive.

---

## 2. Admin vs User Endpoint Map

### Authentication middleware ([src/middleware/AuthenticationMiddleware.ts](src/middleware/AuthenticationMiddleware.ts))
- `checkAuthority` — requires `Authorization` header, verifies JWT, confirms the token matches a stored `TokenModel` doc, injects `req.body.currentUser = { userInfo: <decoded>, token }`.
- `checkRole([roles])` — gates routes by `currentUser.userInfo.role`.
- Roles enum ([src/Utils/UserType/index.ts](src/Utils/UserType/index.ts)): `admin`, `user`. New accounts default to **`user`** (schema default in [src/Utils/Schemas/index.ts](src/Utils/Schemas/index.ts)).

### Endpoint classification (from [src/app.ts](src/app.ts))

| Endpoint | Auth | Role gate | Class |
|----------|------|-----------|-------|
| `POST /authentication/register-email` | Public | branches on role internally | Both (token issuance is **admin-only**) |
| `POST /authentication/active-account` | Public | enforces `admin` in controller | **Admin** |
| `POST /authentication/email-new-code` | Public | enforces `admin` in controller | **Admin** |
| `/user/*` (info CRUD, logout) | Bearer | `admin`, `user` | **Both** |
| `/wishlist/*` | Bearer | `user`, `admin` | **Both** |
| `/shipping/*` | Bearer | `admin`, `user` | **Both** |
| `/order/*` (PublicOrderRouter) | Bearer | `user`, `admin` | **Both** |
| `/admin/categories/*` | Bearer | `admin` | **Admin** |
| `/admin/products/*` | Bearer | `admin` | **Admin** |
| `/admin/orders/*` | Bearer | `admin` | **Admin** |
| `/admin/icons`, `/admin/colors`, `/admin/sizes`, `/admin/offers` | Bearer | `admin` | **Admin** |
| `/aws/*` | Bearer | `admin` | **Admin** |
| `/slider/*` | Bearer | `admin` | **Admin** |
| `/public/*`, `/products/*`, `/home/*`, `GET /` | Public | none | **Public/User-facing** |

> Note: `checkAuthority` is applied globally via `app.use(checkAuthority)` **after** the public routers are mounted, so everything declared below that line in `app.ts` is authenticated.

---

## 3. Admin Flows vs User Flows

### 3.1 Admin login flow (passwordless OTP)
1. `POST /authentication/register-email` with the admin's email.
   - Backend finds the existing admin → generates a 6-digit code, bcrypt-hashes it into `activeCode`, stamps `codeCreatedAt`, emails the plaintext code ("Your Login Code"). Responds `200 { email }`.
2. Admin reads the code from email (valid **15 minutes**, one-time use).
3. `POST /authentication/active-account` with `{ email, activeCode }`.
   - Backend validates role = admin, code not expired, bcrypt match → marks `isConfirmed`, `status = Online`, clears the code, signs a **7-day JWT** and stores it. Responds `200 { accessToken }`.
4. Frontend stores `accessToken` and sends `Authorization: Bearer <token>` on all subsequent admin calls.
5. Need a new code? `POST /authentication/email-new-code`.
6. `POST /user/logout` deletes the token and sets status Offline.

### 3.2 Regular user flow
1. `POST /authentication/register-email` with the user's email.
   - **New email:** account created with role `user`, welcome email sent → `201`.
   - **Existing user:** welcome email resent → `200`.
2. After authentication, a `user`-role token can access shared routes (`/user/*`, `/wishlist/*`, `/shipping/*`, `/order/*`).

> ⚠️ **Important gap to flag:** The active code-verification path (`/active-account`) and code resend (`/email-new-code`) **reject any non-admin role with `403 ROLE_ERROR`**. As implemented, regular `user` accounts have **no endpoint that issues them a JWT** — `register-email` only sends them a welcome email and never generates a code or token. So although many routes are gated for `admin, user`, there is currently no active login path that mints a `user` token (the phone-based path that might have served this is commented out). This is a behavioral observation from the code, not a change request.

### 3.3 Token / session model ([src/Model/Token/TokenModel.ts](src/Model/Token/TokenModel.ts))
- JWT signed with `process.env.TOKEN_SIGNATURE`; access token `expiresIn: 7d`, refresh token helper `expiresIn: 365d` (refresh token generated but no active refresh endpoint).
- Each issued token is persisted (`accessToken`, `user`, `userAgent`); `checkAuthority` requires the presented token to still exist in the DB, so logout (token deletion) hard-invalidates the session.

---

## 4. OTP / Email Verification

- **Mechanism:** 6-digit numeric code via `generateSixDigitCode()` (`100000`–`999999`) ([src/Service/Authentication/AuthService.ts](src/Service/Authentication/AuthService.ts)).
- **Storage:** bcrypt-hashed into `user.activeCode`; issue time in `user.codeCreatedAt` (epoch ms).
- **Validity:** **15 minutes** (`currentTime - createdAt > 15 * 60 * 1000` → `ACTIVE_CODE_EXPIRED`).
- **Single-use:** on successful verification the code fields are `$unset` ([updateUserAndDeleteActiveCode](src/Service/Authentication/AuthService.ts)).
- **Delivery:** Resend/Nodemailer; OTP uses `activeCodeTemplate`, subject "Your Login Code"; welcome uses `welcomeEmailTemplate`/`welcomeEmailText` ([src/Utils/Nodemailer/SendCodeTemplate.ts](src/Utils/Nodemailer/SendCodeTemplate.ts)).
- **Verification flag:** successful activation sets `isConfirmed = true` and `status = Online`.
- **Scope:** OTP issuance and verification are **admin-only** in the current code (see §3.2 gap).
- **Email-only:** SMS/phone OTP support exists in helpers (`SendSMS`, SNS) but the phone routes are commented out and inactive.

---

_Generated from source on 2026-06-18. No source files were modified._
