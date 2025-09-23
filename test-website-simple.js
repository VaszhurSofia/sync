/**
 * Simple Website Testing Script
 * Tests the Sync website functionality without external dependencies
 */

const http = require('http');
const https = require('https');

const WEBSITE_URL = 'http://localhost:3000';
const DEMO_URL = 'http://localhost:3000/demo';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testWebsiteEndpoints() {
  console.log('🌐 Testing Sync Website Endpoints...\n');
  
  try {
    // Test 1: Landing Page
    console.log('1️⃣ Testing Landing Page...');
    const landingResponse = await makeRequest(WEBSITE_URL);
    
    if (landingResponse.status === 200) {
      console.log('✅ Landing page loads successfully (HTTP 200)');
      
      // Check for key content
      const hasHeroTitle = landingResponse.data.includes('Transform Your');
      const hasFeatures = landingResponse.data.includes('AI-Powered Reflection');
      const hasPricing = landingResponse.data.includes('Simple, Transparent Pricing');
      const hasDemoLink = landingResponse.data.includes('/demo');
      
      console.log(`   Hero title present: ${hasHeroTitle ? '✅' : '❌'}`);
      console.log(`   Features section present: ${hasFeatures ? '✅' : '❌'}`);
      console.log(`   Pricing section present: ${hasPricing ? '✅' : '❌'}`);
      console.log(`   Demo link present: ${hasDemoLink ? '✅' : '❌'}`);
      
      if (hasHeroTitle && hasFeatures && hasPricing && hasDemoLink) {
        console.log('✅ All landing page content verified');
      } else {
        console.log('⚠️  Some landing page content missing');
      }
    } else {
      console.log(`❌ Landing page failed (HTTP ${landingResponse.status})`);
    }
    
    // Test 2: Demo Page
    console.log('\n2️⃣ Testing Demo Page...');
    const demoResponse = await makeRequest(DEMO_URL);
    
    if (demoResponse.status === 200) {
      console.log('✅ Demo page loads successfully (HTTP 200)');
      
      // Check for key content
      const hasDemoTitle = demoResponse.data.includes('Welcome to Sync Demo');
      const hasProgressBar = demoResponse.data.includes('Step 1 of 8');
      const hasStartButton = demoResponse.data.includes('Start Demo');
      const hasBackLink = demoResponse.data.includes('Back to Home');
      
      console.log(`   Demo title present: ${hasDemoTitle ? '✅' : '❌'}`);
      console.log(`   Progress bar present: ${hasProgressBar ? '✅' : '❌'}`);
      console.log(`   Start button present: ${hasStartButton ? '✅' : '❌'}`);
      console.log(`   Back link present: ${hasBackLink ? '✅' : '❌'}`);
      
      if (hasDemoTitle && hasProgressBar && hasStartButton && hasBackLink) {
        console.log('✅ All demo page content verified');
      } else {
        console.log('⚠️  Some demo page content missing');
      }
    } else {
      console.log(`❌ Demo page failed (HTTP ${demoResponse.status})`);
    }
    
    // Test 3: Check for Next.js specific content
    console.log('\n3️⃣ Testing Next.js Features...');
    const hasNextJS = landingResponse.data.includes('_next');
    const hasReact = landingResponse.data.includes('__next_f');
    const hasTailwind = landingResponse.data.includes('tailwind');
    
    console.log(`   Next.js assets present: ${hasNextJS ? '✅' : '❌'}`);
    console.log(`   React hydration present: ${hasReact ? '✅' : '❌'}`);
    console.log(`   Tailwind CSS present: ${hasTailwind ? '✅' : '❌'}`);
    
    // Test 4: Check for responsive design
    console.log('\n4️⃣ Testing Responsive Design...');
    const hasViewport = landingResponse.data.includes('viewport');
    const hasResponsiveClasses = landingResponse.data.includes('md:grid-cols');
    const hasMobileClasses = landingResponse.data.includes('sm:px-6');
    
    console.log(`   Viewport meta tag present: ${hasViewport ? '✅' : '❌'}`);
    console.log(`   Responsive grid classes present: ${hasResponsiveClasses ? '✅' : '❌'}`);
    console.log(`   Mobile classes present: ${hasMobileClasses ? '✅' : '❌'}`);
    
    // Test 5: Check for accessibility
    console.log('\n5️⃣ Testing Accessibility...');
    const hasAltText = landingResponse.data.includes('alt=');
    const hasAriaLabels = landingResponse.data.includes('aria-');
    const hasSemanticHTML = landingResponse.data.includes('<nav') && landingResponse.data.includes('<main');
    
    console.log(`   Alt text present: ${hasAltText ? '✅' : '❌'}`);
    console.log(`   ARIA labels present: ${hasAriaLabels ? '✅' : '❌'}`);
    console.log(`   Semantic HTML present: ${hasSemanticHTML ? '✅' : '❌'}`);
    
    console.log('\n🎉 Website endpoint testing completed!');
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    throw error;
  }
}

function printBrowserTestingGuide() {
  console.log('\n📖 BROWSER TESTING GUIDE');
  console.log('========================\n');
  
  console.log('🌐 STEP 1: Open the Website');
  console.log('1. Open your web browser (Chrome, Firefox, Safari, or Edge)');
  console.log('2. Navigate to: http://localhost:3000');
  console.log('3. You should see the Sync landing page with:');
  console.log('   - Hero section: "Transform Your Relationship with AI"');
  console.log('   - Navigation bar with Features, Pricing, Testimonials, Try Demo');
  console.log('   - Two color toggle buttons (blue and green) in the top-right');
  
  console.log('\n🎨 STEP 2: Test Accent Colors');
  console.log('1. Click the blue button (should be active by default)');
  console.log('2. Notice the blue theme throughout the page');
  console.log('3. Click the green button');
  console.log('4. Notice the green theme throughout the page');
  console.log('5. Verify colors change in:');
  console.log('   - Navigation buttons');
  console.log('   - Feature card icons');
  console.log('   - Pricing plan buttons');
  console.log('   - CTA buttons');
  
  console.log('\n📱 STEP 3: Test Responsive Design');
  console.log('1. Resize your browser window to different sizes');
  console.log('2. Test mobile view (narrow width)');
  console.log('3. Test tablet view (medium width)');
  console.log('4. Test desktop view (wide width)');
  console.log('5. Verify all content remains readable and accessible');
  
  console.log('\n🔗 STEP 4: Test Navigation');
  console.log('1. Click on "Features" in the navigation');
  console.log('2. Page should scroll to the features section');
  console.log('3. Click on "Pricing" in the navigation');
  console.log('4. Page should scroll to the pricing section');
  console.log('5. Click on "Testimonials" in the navigation');
  console.log('6. Page should scroll to the testimonials section');
  
  console.log('\n🎮 STEP 5: Test Interactive Demo');
  console.log('1. Click the "Try Demo" button');
  console.log('2. You should navigate to: http://localhost:3000/demo');
  console.log('3. Verify you see:');
  console.log('   - "Welcome to Sync Demo" title');
  console.log('   - 8-step progress bar at the top');
  console.log('   - "Start Demo" button');
  console.log('   - Color toggle buttons in the header');
  console.log('   - "Back to Home" link');
  
  console.log('\n🚀 STEP 6: Test Demo Walkthrough');
  console.log('1. Click "Start Demo" to begin');
  console.log('2. Follow the 8-step process:');
  console.log('   - Step 1: Welcome screen');
  console.log('   - Step 2: Authentication (choose Alice or Bob)');
  console.log('   - Step 3: Couple setup');
  console.log('   - Step 4: Session start');
  console.log('   - Step 5: Communication with AI');
  console.log('   - Step 6: Safety features test');
  console.log('   - Step 7: Survey feedback');
  console.log('   - Step 8: Privacy controls');
  console.log('3. Test the "Test Safety Features" button');
  console.log('4. Test the survey emoji buttons (angry, neutral, happy)');
  console.log('5. Test the "Test Hard Delete" button');
  console.log('6. Click "Restart Demo" to go back to the beginning');
  
  console.log('\n⚡ STEP 7: Test Performance');
  console.log('1. Open Chrome DevTools (F12)');
  console.log('2. Go to the "Lighthouse" tab');
  console.log('3. Click "Generate report"');
  console.log('4. Check the scores for:');
  console.log('   - Performance (should be 90+)');
  console.log('   - Accessibility (should be 95+)');
  console.log('   - Best Practices (should be 95+)');
  console.log('   - SEO (should be 95+)');
  
  console.log('\n🔍 STEP 8: Test Content');
  console.log('1. Scroll through the landing page');
  console.log('2. Verify all sections load properly:');
  console.log('   - Hero section with CTA buttons');
  console.log('   - Features grid (6 cards)');
  console.log('   - Testimonials (3 cards with 5-star ratings)');
  console.log('   - Pricing plans (3 tiers)');
  console.log('   - Footer with links');
  console.log('3. Check that all text is readable');
  console.log('4. Verify all buttons are clickable');
  console.log('5. Test hover effects on cards and buttons');
  
  console.log('\n📊 STEP 9: Test Analytics (Optional)');
  console.log('1. Open Chrome DevTools');
  console.log('2. Go to the "Network" tab');
  console.log('3. Refresh the page');
  console.log('4. Check that all resources load successfully');
  console.log('5. Look for any 404 errors or failed requests');
  
  console.log('\n✅ EXPECTED RESULTS');
  console.log('==================');
  console.log('✅ Landing page loads with hero section');
  console.log('✅ All navigation links work');
  console.log('✅ Accent color toggle works (blue/green)');
  console.log('✅ Features section displays 6 cards');
  console.log('✅ Testimonials section displays 3 cards');
  console.log('✅ Pricing section displays 3 plans');
  console.log('✅ Demo page loads with progress bar');
  console.log('✅ Demo walkthrough works step-by-step');
  console.log('✅ Responsive design works on all screen sizes');
  console.log('✅ All animations and transitions are smooth');
  console.log('✅ Performance scores are high (90+)');
  console.log('✅ No console errors or warnings');
  
  console.log('\n🎉 If all tests pass, the Sync website is working perfectly!');
}

// Run the tests
async function main() {
  try {
    console.log('🚀 Starting Sync Website Tests...\n');
    
    // Run endpoint tests
    await testWebsiteEndpoints();
    
    // Print browser testing guide
    printBrowserTestingGuide();
    
    console.log('\n🌐 Website is ready for testing!');
    console.log('Open http://localhost:3000 in your browser to see the Sync website in action!');
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    console.log('\n💡 Make sure the website is running:');
    console.log('   cd /Users/sofiavas/sync/website && npm run dev');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testWebsiteEndpoints, printBrowserTestingGuide };
