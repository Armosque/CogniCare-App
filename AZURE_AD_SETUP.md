# 🔐 Azure AD Configuration Guide for CogniCare

## Option 1: Setup Real Azure AD (Production)

### Step 1: Create App Registration in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** (Entra ID)
3. Click **App registrations** → **+ New registration**
4. Fill in:
   - **Name**: `CogniCare-Dev` (or your preferred name)
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**: 
     - Platform: `Web`
     - URL: `http://localhost:3000/api/auth/callback/azure-ad`

5. Click **Register**

### Step 2: Get Your Credentials

1. From the Overview page, copy:
   - **Application (client) ID** → `AZURE_AD_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`

2. Go to **Certificates & secrets** → **+ New client secret**
   - Add secret with 24 months expiry
   - Copy the **Value** (not the ID) → `AZURE_AD_CLIENT_SECRET`

### Step 3: Configure Redirect URIs

1. Go to **Authentication**
2. Under **Redirect URIs**, make sure you have:
   - `http://localhost:3000/api/auth/callback/azure-ad`
   - `http://localhost:3000/api/auth/signin/azure-ad`

3. Under **Advanced settings**, enable:
   - **Treat application as a public client**: OFF (leave as is)
   - **Allow public client flows**: OFF

### Step 4: Update `.env.local`

Create/update `frontend/.env.local`:

```bash
AZURE_AD_CLIENT_ID=your-copied-client-id
AZURE_AD_CLIENT_SECRET=your-copied-secret
AZURE_AD_TENANT_ID=your-copied-tenant-id
NEXTAUTH_SECRET=generate-a-random-secret-or-use-openssl
NEXTAUTH_URL=http://localhost:3000
```

Generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Step 5: Restart Frontend

```bash
docker compose restart frontend
```

Now try logging in again!

---

## Option 2: Development/Testing (Mock Auth - No Azure Required)

If you want to skip Azure AD for now and test with a mock user:

### Edit `frontend/src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

// Development: Allow any email/password
const handler = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // DEV ONLY: Accept any credentials
        if (credentials?.email && credentials?.password) {
          return {
            id: "dev-user",
            email: credentials.email,
            name: credentials.email.split('@')[0],
          }
        }
        return null
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "dev-secret",
  pages: {
    signIn: '/auth/signin',
  },
})

export { handler as GET, handler as POST }
```

Then restart frontend and login with any email/password!

---

## Option 3: Hybrid Setup (Azure AD + Development Fallback)

Combine both providers - use Azure AD if available, fall back to mock:

```typescript
import NextAuth from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import Credentials from "next-auth/providers/credentials"

const providers = []

// Try to use Azure AD if configured
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    })
  )
}

// Always add development provider as fallback
providers.push(
  Credentials({
    name: "Development",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      if (process.env.NODE_ENV === "development" && credentials?.email) {
        return {
          id: "dev-" + credentials.email,
          email: credentials.email,
          name: credentials.email.split('@')[0],
        }
      }
      return null
    },
  })
)

const handler = NextAuth({
  providers,
  secret: process.env.NEXTAUTH_SECRET || "dev-secret",
  pages: { signIn: '/auth/signin' },
  session: { strategy: "jwt" },
})

export { handler as GET, handler as POST }
```

---

## Troubleshooting

### "Provider not found" or "No providers configured"
- Check that `.env.local` has been created
- Verify `AZURE_AD_CLIENT_ID` is not empty
- Restart frontend: `docker compose restart frontend`

### "Invalid redirect URI"
- Ensure redirect URI in Azure Portal exactly matches callback URL
- Must include protocol (`http://` or `https://`)

### "Access denied" when signing in
- Check that your Azure AD user has access to the app
- In Azure Portal: **App registrations** → Your app → **Users and groups** → Add users

---

## Testing

After configuration:

```bash
# Check if env vars are loaded
docker compose exec frontend printenv | grep AZURE_AD

# Check auth route status
curl -s http://localhost:3000/api/auth/signin/azure-ad | head -20

# View frontend logs
./dev.sh frontend-logs
```
