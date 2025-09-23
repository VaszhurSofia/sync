#!/bin/bash

# Sync GitHub Setup Script
# This script helps you set up your GitHub repository and deploy your website

echo "🚀 Setting up Sync for GitHub deployment..."
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run 'git init' first."
    exit 1
fi

echo "✅ Git repository initialized"
echo ""

# Check if remote origin exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "✅ Remote origin already exists:"
    git remote get-url origin
else
    echo "📝 No remote origin found. You'll need to:"
    echo "   1. Go to GitHub.com and create a new repository called 'sync'"
    echo "   2. Copy the repository URL"
    echo "   3. Run: git remote add origin <your-repo-url>"
    echo "   4. Run: git push -u origin main"
    echo ""
fi

echo "🌐 Deployment Options:"
echo ""
echo "Option 1: Vercel (Recommended for Next.js)"
echo "   1. Go to https://vercel.com"
echo "   2. Sign up with GitHub"
echo "   3. Import your 'sync' repository"
echo "   4. Set root directory to 'website'"
echo "   5. Deploy!"
echo ""
echo "Option 2: GitHub Pages"
echo "   1. Enable GitHub Pages in repository settings"
echo "   2. Use GitHub Actions workflow (already included)"
echo ""
echo "Option 3: Netlify"
echo "   1. Go to https://netlify.com"
echo "   2. Connect your GitHub repository"
echo "   3. Set build command: 'cd website && npm run build'"
echo "   4. Deploy!"
echo ""

echo "📋 Next Steps:"
echo "   1. Create GitHub repository"
echo "   2. Add remote origin"
echo "   3. Push your code"
echo "   4. Deploy to your chosen platform"
echo "   5. Share your live website!"
echo ""

echo "🎉 Your Sync website is ready to go public!"
echo "   Check DEPLOYMENT-GUIDE.md for detailed instructions"
