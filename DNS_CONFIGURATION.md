# DNS Configuration Instructions for cpatchessarena.in

**YOUR SERVER'S PUBLIC IP: 14.139.201.178**

Follow these steps to configure DNS records for your domain:

## 1. Access Your Domain Registrar

Go to your domain registrar's website:
- **GoDaddy**: godaddy.com → My Domains → cpatchessarena.in
- **Namecheap**: namecheap.com → Dashboard → cpatchessarena.in
- **Route53 (AWS)**: console.aws.amazon.com → Route 53
- **Digitalocean**: digitalocean.com → Networking → Domains

## 2. Add DNS A Records

Add TWO A records as follows:

### Record 1: Root Domain
```
Type:     A
Name:     cpatchessarena.in (or @)
Value:    14.139.201.178
TTL:      3600 (or lowest available)
```

### Record 2: WWW Subdomain
```
Type:     A
Name:     www.cpatchessarena.in (or www)
Value:    14.139.201.178
TTL:      3600 (or lowest available)
```

## 3. Save Changes

Click "Save" or "Update" button in your registrar's interface.

## 4. Wait for DNS Propagation

DNS changes take **5-15 minutes** to propagate globally (sometimes up to 48 hours).

## 5. Verify DNS Resolution

After waiting, verify DNS is working:

```bash
# Test with nslookup
nslookup cpatchessarena.in
# Should show: 14.139.201.178

# Test with dig
dig cpatchessarena.in
# Should show: cpatchessarena.in. IN A 14.139.201.178

# Test with ping
ping cpatchessarena.in
# Should respond from 14.139.201.178
```

## Common Registrar Instructions

### GoDaddy
1. Go to "My Domains"
2. Select "Manage" next to cpatchessarena.in
3. Go to "DNS" tab
4. Edit A records:
   - Name: @ → Points to: 14.139.201.178
   - Name: www → Points to: 14.139.201.178
5. Click "Save"

### Namecheap
1. Go to "Dashboard"
2. Click "Manage" next to cpatchessarena.in
3. Go to "Advanced DNS"
4. Add two A records:
   - Host: @ → IP: 14.139.201.178
   - Host: www → IP: 14.139.201.178
5. Click "Save Changes"

### AWS Route 53
1. Go to "Hosted zones"
2. Click cpatchessarena.in
3. Create two A Records:
   - Name: cpatchessarena.in → Value: 14.139.201.178
   - Name: www.cpatchessarena.in → Value: 14.139.201.178
4. Click "Create records"

## ✅ How to Verify Step-by-Step

```bash
# Step 1: Wait 5-15 minutes
sleep 600  # Wait 10 minutes

# Step 2: Check DNS with nslookup
nslookup cpatchessarena.in

# Expected output:
# Server:   [Your DNS Server]
# Address:  [IP Address]
# 
# Name:     cpatchessarena.in
# Address:  14.139.201.178

# Step 3: Check DNS with dig
dig cpatchessarena.in

# Expected output:
# cpatchessarena.in. 3600 IN A 14.139.201.178

# Step 4: Check with online tools
# Visit: https://mxtoolbox.com/nslookup.aspx
# Enter: cpatchessarena.in
# Should show: 14.139.201.178
```

## ⏱️ Timeline
- **Now**: Add DNS records
- **5-15 min**: Local verification works
- **24h**: Fully propagated globally
- **Then**: Run Let's Encrypt setup

## 🚨 Common Issues

### Issue: "Nslookup shows old IP"
**Solution**: Your DNS cache needs clearing
```bash
# Clear DNS cache
sudo systemctl restart systemd-resolved
# or use
sudo resolvectl flush-caches
# Wait 1 minute and check again
```

### Issue: "Still shows NXDOMAIN after 30 min"
**Solution**: DNS records might not be saved
- Verify in registrar: Records are actually saved
- Clear registrar's cache (some have clear cache button)
- Try different DNS server: `nslookup cpatchessarena.in 8.8.8.8`

### Issue: "Wrong IP address"
**Solution**: You added wrong IP
- Double-check: `curl -s https://api.ipify.org`
- Update records with correct IP
- Wait 5 minutes and retry

## ✅ Ready for Next Step?

Once DNS verification is complete and shows your IP (14.139.201.178):

```bash
cd /home/cdac/Chess-Host

# Start Docker services
sudo docker-compose up -d

# Get Let's Encrypt certificate
sudo bash init-letsencrypt.sh

# Verify certificate
bash cert-manager.sh status
```

## 📞 Support

If DNS doesn't work after 1 hour:
1. Check registrar's DNS settings are saved
2. Try different DNS: `nslookup cpatchessarena.in 8.8.8.8`
3. Check registrar's documentation for their specific steps
4. Contact registrar's support if still failing

