# 🚀 Sync Website Deployment Guide

## 🌐 **Make Your Website Public**

This guide will help you deploy your Sync website to make it publicly accessible via GitHub.

---

## 🎯 **Deployment Options**

### **Option 1: Vercel (Recommended) ⭐**

**Why Vercel?**
- ✅ Perfect for Next.js applications
- ✅ Free tier with excellent performance
- ✅ Automatic deployments from GitHub
- ✅ Custom domains and SSL certificates
- ✅ Global CDN for fast loading

**Steps:**

1. **Push to GitHub:**
   ```bash
   cd /Users/sofiavas/sync
   git add .
   git commit -m "Add Sync website with structured communication flow"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account
   - Click "New Project"
   - Import your `sync` repository
   - Set the root directory to `website`
   - Deploy!

3. **Your website will be live at:**
   - `https://your-project-name.vercel.app`
   - You can add a custom domain later

---

### **Option 2: GitHub Pages**

**Steps:**

1. **Update package.json:**
   ```json
   {
     "scripts": {
       "export": "next export",
       "deploy": "npm run build && npm run export"
     }
   }
   ```

2. **Create GitHub Actions workflow:**
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [ main ]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: actions/setup-node@v2
           with:
             node-version: '18'
         - run: cd website && npm install
         - run: cd website && npm run build
         - run: cd website && npm run export
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./website/out
   ```

3. **Enable GitHub Pages:**
   - Go to your repository settings
   - Scroll to "Pages" section
   - Select "GitHub Actions" as source
   - Your site will be at `https://yourusername.github.io/sync`

---

### **Option 3: Netlify**

**Steps:**

1. **Push to GitHub** (same as above)

2. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub
   - Click "New site from Git"
   - Select your repository
   - Set build command: `cd website && npm run build`
   - Set publish directory: `website/.next`
   - Deploy!

---

## 🔧 **Pre-Deployment Setup**

### **1. Update Environment Variables**

For production, you'll need to set up your API endpoints:

```bash
# In Vercel/Netlify dashboard, add these environment variables:
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
NEXT_PUBLIC_AI_SERVICE_URL=https://your-ai-service-domain.com
```

### **2. Update API Configuration**

Update your `next.config.js` for production:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ['@sync/ui', '@sync/types'],
  env: {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
    AI_SERVICE_URL: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:3002',
  },
  async rewrites() {
    // Only use rewrites in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.API_BASE_URL || 'http://localhost:3001'}/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
```

### **3. Add Production Build Scripts**

Update `website/package.json`:

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "export": "next export",
    "deploy": "npm run build"
  }
}
```

---

## 📋 **Deployment Checklist**

### **Before Deployment:**
- [ ] Test website locally (`npm run dev`)
- [ ] Ensure all features work
- [ ] Check responsive design
- [ ] Verify no console errors
- [ ] Test demo walkthrough
- [ ] Update environment variables

### **After Deployment:**
- [ ] Test live website
- [ ] Check all pages load correctly
- [ ] Verify demo functionality
- [ ] Test on mobile devices
- [ ] Check performance scores
- [ ] Set up custom domain (optional)
- [ ] Add analytics (optional)

---

## 🌍 **Making It Public**

### **1. GitHub Repository**

Make sure your repository is public:

```bash
# Check current status
git remote -v

# If private, make it public:
# Go to GitHub.com → Your Repository → Settings → General → Danger Zone → Change visibility
```

### **2. Add README**

Create a public-facing README:

```markdown
# 💕 Sync - AI-Powered Couple Communication

Transform your relationship with AI-powered reflection, clarification, and micro-actions.

## 🌐 Live Demo

**Try the interactive demo:** [https://your-website-url.com/demo](https://your-website-url.com/demo)

## ✨ Features

- 🤖 AI-powered relationship insights
- 🔒 Privacy-first design
- 🛡️ Enterprise safety features
- 📊 Relationship analytics
- 💬 Structured communication flow

## 🚀 Quick Start

1. Visit our website: [https://your-website-url.com](https://your-website-url.com)
2. Try the interactive demo
3. Experience AI-powered couple communication

## 🏗️ Built With

- Next.js 14
- TypeScript
- Tailwind CSS
- Framer Motion
- AI Integration

## 📄 License

Private - All rights reserved.
```

---

## 🎉 **Success!**

Once deployed, your Sync website will be:

- ✅ **Publicly accessible** via the internet
- ✅ **Shareable** with anyone via URL
- ✅ **Professional** and ready for users
- ✅ **Fast** with global CDN
- ✅ **Secure** with SSL certificates
- ✅ **Mobile-friendly** on all devices

---

## 🔗 **Share Your Website**

After deployment, you can share:

- **Main Website:** `https://your-domain.com`
- **Interactive Demo:** `https://your-domain.com/demo`
- **GitHub Repository:** `https://github.com/yourusername/sync`

---

## 🆘 **Need Help?**

If you encounter any issues:

1. **Check the deployment logs** in Vercel/Netlify dashboard
2. **Verify environment variables** are set correctly
3. **Test locally first** to ensure everything works
4. **Check browser console** for any errors
5. **Review the build output** for warnings

**Your Sync website is ready to go public!** 🌐✨
