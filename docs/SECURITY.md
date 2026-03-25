# 🔒 CogniCare Security Guidelines

## Critical: Credential Management

### NEVER commit credentials to Git

All environment variables containing secrets **MUST** be in `.env.local`, which is **explicitly excluded** from Git via `.gitignore`.

```bash
# ✅ CORRECT - Credentials in .env.local
AZURE_COSMOS_KEY=actual-secret-key-here    # Git-ignored

# ❌ WRONG - Credentials in code/config
export const API_KEY = "hardcoded-secret"  # NEVER DO THIS
```

### .env.local vs .env.example

- **`.env.local`**: Local development only, contains REAL credentials, **safe because it's in .gitignore**
  - Must exist with actual values for the app to work
  - Must NEVER be committed to Git (already excluded in `.gitignore`)
  - This is your local configuration file - keep it private and never share it
  
- **`.env.example`**: Template showing which variables are needed, safe to commit
  - Shows structure and optional/required variables
  - Use as reference when setting up new environments
  
- **`.gitignore`**: Already excludes `.env.local`, `.env`, and all other secret files
  - Verify with: `git status | grep env` (should show nothing)

### Environment Variable Types

#### REQUIRED (Application fails without these)
```bash
AZURE_COSMOS_ENDPOINT=https://cosmos:8081/
AZURE_COSMOS_KEY=<actual-key>
```

#### OPTIONAL (Has defaults or graceful degradation)
```bash
BACKEND_DEBUG=false
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://backend:8000
```

#### LEGACY/OPTIONAL (Deprecated, only for fallback)
```bash
NEXTAUTH_SECRET=    # Not used in new architecture
AZURE_AI_AGENT_KEY= # Optional, only if using AI
```

## Security Best Practices

### 1. Configuration Management

✅ **DO:**
- Use environment variables for ALL secrets (loaded from `.env.local`)
- Keep `.env.local` with REAL credentials locally (it's git-ignored)
- Validate required vars at startup (application fails if missing)
- Use different credentials for dev/staging/production
- Rotate credentials regularly (especially API keys and secrets)
- Use Azure Managed Identity in production (no secrets needed!)

❌ **DON'T:**
- Hardcode secrets in code (`config.py`, `main.py`, etc.)
- Store credentials in committed files (those not in `.gitignore`)
- Use same credentials across environments
- Commit `.env.local` (it's git-ignored for this reason)
- Log sensitive values
- Share `.env.local` or credentials via Slack/email

### 2. Cosmos DB Security

```python
# ✅ CORRECT - From environment only
endpoint = os.getenv("AZURE_COSMOS_ENDPOINT")
key = os.getenv("AZURE_COSMOS_KEY")

if not endpoint or not key:
    raise ConfigError("Missing required Cosmos DB credentials")

# ❌ WRONG - Hardcoded defaults
endpoint = os.getenv("AZURE_COSMOS_ENDPOINT", "https://cosmos:8081/")
key = os.getenv("AZURE_COSMOS_KEY", "C2y6yDjf5/R+ob0...")  # EXPOSED!
```

### 3. Local Development (Docker Compose)

**✅ Perfectly safe** to store actual credentials in `.env.local` because:
- It's explicitly in `.gitignore` → never committed
- It's your local development file → keep it private
- Required for the application to work locally

```bash
# .env.local (Git-ignored, so these are safe)
AZURE_COSMOS_ENDPOINT=https://cosmos:8081/
AZURE_COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqA10VLur1estUZYKwEsrWjcaBJ15DVQiE3A==
AZURE_CLIENT_SECRET=actual-secret-value  ← SAFE HERE (git-ignored)
```

**❌ NEVER** commit real credentials in:
- Python/TypeScript code files
- `docker-compose.yml` (should use `${VAR}` interpolation, not hardcoded values)
- Any file tracked by Git

### 4. Production Deployment

**Azure Managed Identity (Recommended)**
```bash
# No secrets in environment - identity handled by Azure infrastructure
# Uses Azure AD Service Principal automatically
AZURE_COSMOS_ENDPOINT=https://cognicare.documents.azure.com:443/
# NO KEY NEEDED - Managed Identity provides authentication
```

**Service Principal (Alternative)**
```bash
# Use Azure Key Vault to store secrets
# Application retrieves from Key Vault at runtime
docker run \
  -e AZURE_CLIENT_ID=xxx \
  -e AZURE_CLIENT_SECRET=xxx \
  -e AZURE_TENANT_ID=xxx \
  -e AZURE_KEYVAULT_ENDPOINT=https://vault.azure.net/ \
  cognicare-backend
```

## Incident Response: If Credentials Are Exposed

### Immediate Actions (within 5 minutes)

1. **Rotate all exposed credentials immediately**
   ```bash
   # In Azure Portal:
   # 1. Cosmos DB → Keys → Regenerate Primary Key
   # 2. Azure AD → App registrations → Certificates → Create new secret
   ```

2. **Update .env.local with new credentials**
   ```bash
   AZURE_COSMOS_KEY=<new-key>
   AZURE_CLIENT_SECRET=<new-secret>
   ```

3. **Redeploy applications**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

### Investigation (within 1 hour)

1. **Check Git history for commits with secrets**
   ```bash
   # Search for pattern of secrets in history
   git log -p | grep -i "AZURE_COSMOS_KEY\|secret\|password"
   
   # If found in history, credentials are COMPROMISED
   # Proceed to rotation even if already done
   ```

2. **Enable Azure audit logging**
   - Check Access Control (IAM) for unauthorized changes
   - Monitor Activity Log for suspicious operations
   - Set up alerts for sensitive operations

3. **Review Azure Portal for unauthorized access**
   - Check Cosmos DB connections
   - Review Azure AD sign-in activity

### Prevention Going Forward

1. **Pre-commit hooks** (catch secrets before commit)
   ```bash
   # Install git-secrets or similar tool
   brew install git-secrets  # macOS
   git secrets --install
   git secrets --register-aws  # or custom pattern
   ```

2. **GitHub Secret Scanning** (if using GitHub)
   - Settings → Security → Advance security
   - Enable Secret scanning
   - Enable Push protection

3. **Azure Key Vault Integration**
   - Store ALL secrets in Azure Key Vault
   - Application retrieves at runtime
   - No secrets in environment files

## Credential Rotation Schedule

| Credential | Rotation | Reason |
|-----------|----------|--------|
| AZURE_COSMOS_KEY | 90 days | Primary encryption key |
| AZURE_CLIENT_SECRET | 90 days | Service principal secret |
| NEXTAUTH_SECRET | Never (1:N) | JWT signing, change = invalidates sessions |
| AZURE_AI_AGENT_KEY | 180 days | API keys have lower risk than auth secrets |

## Code Review Checklist

Before merging PRs, verify:

- [ ] No secrets in code (search for `password`, `secret`, `key`, `token`)
- [ ] No hardcoded connection strings
- [ ] Configuration comes from environment variables
- [ ] `.env.local` is in `.gitignore`
- [ ] Sensitive values use placeholder text in `.env.example`
- [ ] Logging doesn't expose sensitive data
- [ ] Error messages don't leak configuration
- [ ] Docker image doesn't contain secrets (use `.dockerignore`)

## References

- [12-Factor App - Config](https://12factor.net/config)
- [OWASP - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Azure Security Best Practices](https://docs.microsoft.com/azure/security/fund-concepts)
- [Git Security: Preventing Secret Leaks](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
