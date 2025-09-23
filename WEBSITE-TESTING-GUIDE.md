# 🌐 Sync Website Testing Guide

## 🚀 **Quick Start**

The Sync website is now running and ready for testing! Here's everything you need to know:

### **Access URLs**
- **Landing Page**: http://localhost:3000
- **Interactive Demo**: http://localhost:3000/demo

---

## 📋 **Testing Checklist**

### ✅ **Landing Page Tests** (http://localhost:3000)

#### **1. Page Load & Hero Section**
- [ ] Page loads quickly (< 3 seconds)
- [ ] Hero title shows: "Transform Your **Relationship** with AI"
- [ ] Subtitle explains Sync's purpose
- [ ] Two CTA buttons: "Try Free Demo" and "Watch Demo"
- [ ] Background gradient is visible

#### **2. Navigation Bar**
- [ ] Logo and "Sync" text in top-left
- [ ] Navigation links: Features, Pricing, Testimonials, Try Demo
- [ ] Two color toggle buttons (blue/green) in top-right
- [ ] Navigation is sticky (stays at top when scrolling)

#### **3. Accent Color Toggle**
- [ ] Blue button is active by default
- [ ] Click green button → entire page changes to green theme
- [ ] Click blue button → entire page changes to blue theme
- [ ] Colors change in: buttons, icons, gradients, accents

#### **4. Features Section**
- [ ] Section title: "Everything You Need for Better Communication"
- [ ] 6 feature cards displayed in grid:
  - [ ] AI-Powered Reflection (blue brain icon)
  - [ ] Real-time Communication (green message icon)
  - [ ] Enterprise Safety (blue shield icon)
  - [ ] Couple Management (green users icon)
  - [ ] Relationship Insights (blue heart icon)
  - [ ] Privacy First (green lock icon)
- [ ] Cards have hover effects (scale up slightly)

#### **5. Testimonials Section**
- [ ] Section title: "Loved by Couples Worldwide"
- [ ] 3 testimonial cards with 5-star ratings
- [ ] Testimonials from: Sarah & Michael, Emma & David, Lisa & James
- [ ] Cards have subtle animations

#### **6. Pricing Section**
- [ ] Section title: "Simple, Transparent Pricing"
- [ ] 3 pricing tiers: Free, Pro, Enterprise
- [ ] Pro plan has "Most Popular" badge
- [ ] Each plan shows features with checkmarks
- [ ] Pricing buttons change color with accent theme

#### **7. Call-to-Action Section**
- [ ] Blue-to-green gradient background
- [ ] Title: "Ready to Transform Your Relationship?"
- [ ] Large "Start Your Free Demo" button
- [ ] Button has hover effects

#### **8. Footer**
- [ ] Dark background with white text
- [ ] Sync logo and description
- [ ] 4 columns: Product, Company, Support links
- [ ] Copyright notice at bottom

---

### ✅ **Interactive Demo Tests** (http://localhost:3000/demo)

#### **1. Demo Page Load**
- [ ] Page loads with "Welcome to Sync Demo" title
- [ ] 8-step progress bar visible at top
- [ ] "Start Demo" button present
- [ ] Color toggle buttons in header
- [ ] "Back to Home" link works

#### **2. Demo Walkthrough (8 Steps)**

**Step 1: Welcome**
- [ ] Heart icon and welcome message
- [ ] "Start Demo" button works

**Step 2: Authentication**
- [ ] Shield icon and authentication explanation
- [ ] Two user options: Alice and Bob
- [ ] Click either user → proceeds to next step

**Step 3: Couple Setup**
- [ ] Users icon and couple setup explanation
- [ ] "Create Couple" button works

**Step 4: Session Start**
- [ ] Message circle icon and session explanation
- [ ] "Start Session" button works

**Step 5: Communication Session**
- [ ] Chat interface with message history
- [ ] Input field for typing messages
- [ ] Send button works
- [ ] "Test Safety Features" button present
- [ ] "Continue" button to proceed

**Step 6: Safety Features**
- [ ] Shield icon and safety explanation
- [ ] Shows safety violation count
- [ ] Red warning box about blocked content
- [ ] "Continue to Survey" button

**Step 7: Survey Feedback**
- [ ] Smile icon and feedback request
- [ ] Three emoji buttons: 😠 (angry), 😐 (neutral), 😊 (happy)
- [ ] Click any emoji → proceeds to next step

**Step 8: Privacy Controls**
- [ ] Lock icon and privacy explanation
- [ ] Two cards: Data Access, Hard Delete
- [ ] "Test Hard Delete" button opens modal
- [ ] "Restart Demo" button returns to beginning

#### **3. Demo Interactions**
- [ ] Progress bar updates as you advance
- [ ] Step counter shows current progress
- [ ] Color toggle works throughout demo
- [ ] All buttons are clickable and responsive
- [ ] Modal dialogs work properly

---

### ✅ **Responsive Design Tests**

#### **Desktop (1280px+)**
- [ ] Full layout with all sections visible
- [ ] 3-column grid for features and pricing
- [ ] Large text and buttons
- [ ] Hover effects work

#### **Tablet (768px - 1279px)**
- [ ] 2-column grid for features
- [ ] Navigation collapses appropriately
- [ ] Text remains readable
- [ ] Touch interactions work

#### **Mobile (320px - 767px)**
- [ ] Single column layout
- [ ] Navigation becomes hamburger menu
- [ ] Text is large enough to read
- [ ] Buttons are touch-friendly
- [ ] Demo walkthrough works on mobile

---

### ✅ **Performance Tests**

#### **Chrome DevTools Lighthouse**
- [ ] Performance: 90+ score
- [ ] Accessibility: 95+ score
- [ ] Best Practices: 95+ score
- [ ] SEO: 95+ score

#### **Network Tab**
- [ ] All resources load successfully
- [ ] No 404 errors
- [ ] Images and fonts load quickly
- [ ] JavaScript bundles are optimized

#### **Console**
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No accessibility warnings

---

## 🎨 **Visual Design Tests**

### **Color Themes**
- [ ] **Blue Theme**: Primary blue (#3B82F6), secondary blue (#1E40AF)
- [ ] **Green Theme**: Primary green (#10B981), secondary green (#047857)
- [ ] **Neutral Colors**: Proper contrast ratios
- [ ] **Gradients**: Smooth blue-to-green transitions

### **Typography**
- [ ] **Inter Font**: Clean, readable text
- [ ] **Font Weights**: Proper hierarchy (300, 400, 500, 600, 700)
- [ ] **Text Sizes**: Responsive scaling
- [ ] **Line Heights**: Comfortable reading

### **Animations**
- [ ] **Framer Motion**: Smooth page transitions
- [ ] **Hover Effects**: Subtle card scaling
- [ ] **Loading States**: Spinner animations
- [ ] **Color Transitions**: Smooth theme switching

---

## 🔧 **Technical Tests**

### **Browser Compatibility**
- [ ] **Chrome**: Full functionality
- [ ] **Firefox**: Complete compatibility
- [ ] **Safari**: All features work
- [ ] **Edge**: Perfect performance

### **Accessibility**
- [ ] **Keyboard Navigation**: Tab through all elements
- [ ] **Screen Reader**: Proper ARIA labels
- [ ] **Color Contrast**: WCAG 2.1 AA compliant
- [ ] **Focus Indicators**: Clear focus states

### **SEO**
- [ ] **Meta Tags**: Title, description, keywords
- [ ] **Open Graph**: Social media sharing
- [ ] **Structured Data**: Proper HTML semantics
- [ ] **Sitemap**: All pages discoverable

---

## 🚨 **Common Issues & Solutions**

### **Page Won't Load**
- Check if website is running: `cd /Users/sofiavas/sync/website && npm run dev`
- Verify port 3000 is available
- Check browser console for errors

### **Demo Not Working**
- Ensure API server is running on port 3001
- Ensure AI service is running on port 3002
- Check network tab for failed requests

### **Colors Not Changing**
- Clear browser cache
- Check if JavaScript is enabled
- Verify Framer Motion is loading

### **Mobile Issues**
- Test in actual mobile browser
- Check viewport meta tag
- Verify touch interactions

---

## 🎉 **Success Criteria**

The Sync website is working perfectly when:

✅ **Landing page loads with all sections**  
✅ **Accent color toggle works (blue/green)**  
✅ **Navigation links scroll to sections**  
✅ **Demo page loads with progress bar**  
✅ **Demo walkthrough works step-by-step**  
✅ **Responsive design works on all devices**  
✅ **Performance scores are high (90+)**  
✅ **No console errors or warnings**  
✅ **All animations are smooth**  
✅ **Accessibility standards are met**  

---

## 🌐 **Ready to Test!**

**Open your browser and go to: http://localhost:3000**

The Sync website is now live and ready for you to explore all the features we've built! 🚀✨
