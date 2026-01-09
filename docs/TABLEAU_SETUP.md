# Tableau Cloud Setup Guide

This guide walks you through connecting Mortality Signals to Tableau Cloud for embedded dashboards.

---

## Prerequisites

- Tableau Cloud account (or Tableau Server)
- Site Administrator or Creator role
- Published workbooks to embed

---

## Step 1: Create a Connected App

1. **Log into Tableau Cloud**
   - Go to your Tableau Cloud site
   - Navigate to **Settings** → **Connected Apps**

2. **Create New Connected App**
   - Click **New Connected App**
   - Choose **Direct Trust** (simplest for hackathon)
   - Name it: `Mortality Signals Embed`

3. **Configure Settings**
   - **Enabled**: Yes
   - **Access Level**: Embed (recommended)
   - Copy these values:
     - **Client ID** (also called App ID)
     - **Secret ID**
     - **Secret Value** ⚠️ Save this immediately, it's only shown once!

4. **Set Domain Allowlist**
   - Add your app's domain:
     - Development: `http://localhost:5173`
     - Production: `https://your-domain.com`

---

## Step 2: Configure Environment Variables

Create/update your `.env` file in the project root:

```bash
# Tableau Cloud Configuration
TABLEAU_BASE_URL=https://10ax.online.tableau.com
TABLEAU_SITE_CONTENT_URL=your-site-name
TABLEAU_CLIENT_ID=your-client-id-here
TABLEAU_SECRET_ID=your-secret-id-here
TABLEAU_SECRET_VALUE=your-secret-value-here

# Token settings
TABLEAU_EMBED_TOKEN_EXPIRY_MINUTES=10
```

### Finding Your Values

| Variable | Where to Find |
|----------|---------------|
| `TABLEAU_BASE_URL` | Your Tableau Cloud URL (e.g., `https://10ax.online.tableau.com`) |
| `TABLEAU_SITE_CONTENT_URL` | The part after `/site/` in your Tableau URL |
| `TABLEAU_CLIENT_ID` | Connected Apps page → Your app → Client ID |
| `TABLEAU_SECRET_ID` | Connected Apps page → Your app → Secrets tab |
| `TABLEAU_SECRET_VALUE` | Shown once when you create the secret |

---

## Step 3: Create and Publish Workbooks

### Option A: Use the Data Export

1. Start your API server
2. Download data:
   ```bash
   curl http://localhost:8000/api/export/csv/main > mortality_data.csv
   ```
3. Open Tableau Desktop
4. Connect to the CSV file
5. Create your visualizations
6. Publish to Tableau Cloud

### Option B: Connect Tableau to API Directly

Use Tableau's Web Data Connector:

1. In Tableau Desktop: **Data** → **Web Data Connector**
2. Enter: `http://localhost:8000/api/export/wdc-config`
3. Follow the prompts to load data

---

## Step 4: Publish Workbooks

Create these workbooks (matching the specs in `tableau/WORKBOOK_SPECS.md`):

### Workbook: MortalitySignals

**Dashboards:**
1. `GlobalOverview` - World map, KPIs, signal feed
2. `EntityProfile` - Single entity deep-dive
3. `Comparison` - Multi-entity comparison
4. `Scenario` - What-if analysis

**Publish Settings:**
- Project: Create a "Mortality Signals" project
- Permissions: Ensure embed users have View access
- Data source: Embed credentials or use extract

---

## Step 5: Test the Integration

1. **Restart your API server** (to pick up new env vars)

2. **Check health endpoint:**
   ```bash
   curl http://localhost:8000/api/tableau/health
   ```
   
   Should return:
   ```json
   {
     "status": "healthy",
     "configured": true,
     "issues": null,
     "base_url": "https://10ax.online.tableau.com"
   }
   ```

3. **Test token generation:**
   ```bash
   curl -X POST http://localhost:8000/api/tableau/embed-token
   ```
   
   Should return a JWT token.

4. **Open the app** and navigate to any page with Tableau embedding.

---

## Troubleshooting

### "redirect_uri mismatch"
- Verify your domain is in the Connected App's allowlist
- Check that the URL exactly matches (including http vs https)

### "invalid_client"
- Double-check Client ID and Secret Value
- Ensure the Connected App is enabled
- Verify the secret hasn't been rotated

### "Access Denied" in embed
- User doesn't have permission to the workbook
- Check project/workbook permissions in Tableau Cloud
- Ensure the user exists in Tableau Cloud

### Token expired
- Increase `TABLEAU_EMBED_TOKEN_EXPIRY_MINUTES`
- Implement token refresh in frontend

### CORS errors
- Add your domain to Connected App allowlist
- Check API CORS settings in `api/main.py`

---

## Security Best Practices

1. **Never commit secrets**
   - Add `.env` to `.gitignore`
   - Use secret managers in production

2. **Rotate secrets regularly**
   - Create new secret in Connected App
   - Update environment variable
   - Delete old secret

3. **Use short token expiry**
   - 10 minutes is recommended
   - Frontend should handle token refresh

4. **Restrict domains**
   - Only allow your production domain
   - Remove localhost in production

---

## Production Deployment

### Environment Variables (Production)

Use your cloud provider's secret manager:

**AWS:**
```bash
aws secretsmanager create-secret \
  --name mortality-signals/tableau \
  --secret-string '{"client_id":"...","secret_id":"...","secret_value":"..."}'
```

**GCP:**
```bash
gcloud secrets create tableau-credentials \
  --data-file=tableau-secrets.json
```

### Docker Compose (Production)

```yaml
services:
  api:
    environment:
      - TABLEAU_BASE_URL=${TABLEAU_BASE_URL}
      - TABLEAU_SITE_CONTENT_URL=${TABLEAU_SITE_CONTENT_URL}
      - TABLEAU_CLIENT_ID=${TABLEAU_CLIENT_ID}
      - TABLEAU_SECRET_ID=${TABLEAU_SECRET_ID}
      - TABLEAU_SECRET_VALUE=${TABLEAU_SECRET_VALUE}
```

---

## Next Steps

1. ✅ Connected App created
2. ✅ Environment variables set
3. ✅ Workbooks published
4. ✅ Integration tested
5. 🎯 Build your demo!

---

## Support

- [Tableau Embedding API Docs](https://help.tableau.com/current/api/embedding_api/en-us/index.html)
- [Connected Apps Guide](https://help.tableau.com/current/online/en-us/connected_apps.htm)
- [JWT Authentication](https://help.tableau.com/current/online/en-us/connected_apps_direct.htm)
