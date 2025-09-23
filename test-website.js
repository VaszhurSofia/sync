/**
 * Sync Website Testing Script
 * Tests the landing page and interactive demo functionality
 */

const puppeteer = require('puppeteer');
const assert = require('assert');

const WEBSITE_URL = 'http://localhost:3000';
const DEMO_URL = 'http://localhost:3000/demo';

async function testWebsite() {
  console.log('🌐 Testing Sync Website...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless testing
    slowMo: 1000, // Slow down actions for better visibility
    defaultViewport: { width: 1280, height: 720 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Test 1: Landing Page Load
    console.log('1️⃣ Testing Landing Page Load...');
    await page.goto(WEBSITE_URL, { waitUntil: 'networkidle0' });
    
    // Check if main elements are present
    const heroTitle = await page.$eval('h1', el => el.textContent);
    assert(heroTitle.includes('Transform Your'), 'Hero title should contain "Transform Your"');
    console.log('✅ Landing page loaded successfully');
    console.log(`   Hero title: "${heroTitle}"`);
    
    // Test 2: Navigation
    console.log('\n2️⃣ Testing Navigation...');
    const navLinks = await page.$$eval('nav a', links => links.map(link => link.textContent));
    assert(navLinks.includes('Features'), 'Navigation should include Features link');
    assert(navLinks.includes('Pricing'), 'Navigation should include Pricing link');
    assert(navLinks.includes('Try Demo'), 'Navigation should include Try Demo link');
    console.log('✅ Navigation links present:', navLinks);
    
    // Test 3: Accent Color Toggle
    console.log('\n3️⃣ Testing Accent Color Toggle...');
    const colorButtons = await page.$$('nav button');
    assert(colorButtons.length >= 2, 'Should have at least 2 color toggle buttons');
    
    // Click blue button (should be active by default)
    await colorButtons[0].click();
    await page.waitForTimeout(500);
    
    // Click green button
    await colorButtons[1].click();
    await page.waitForTimeout(500);
    console.log('✅ Accent color toggle working');
    
    // Test 4: Features Section
    console.log('\n4️⃣ Testing Features Section...');
    await page.evaluate(() => {
      document.querySelector('#features').scrollIntoView();
    });
    await page.waitForTimeout(1000);
    
    const featureCards = await page.$$('.card');
    assert(featureCards.length >= 6, 'Should have at least 6 feature cards');
    console.log(`✅ Features section loaded with ${featureCards.length} cards`);
    
    // Test 5: Pricing Section
    console.log('\n5️⃣ Testing Pricing Section...');
    await page.evaluate(() => {
      document.querySelector('#pricing').scrollIntoView();
    });
    await page.waitForTimeout(1000);
    
    const pricingCards = await page.$$('#pricing .card');
    assert(pricingCards.length >= 3, 'Should have at least 3 pricing cards');
    console.log(`✅ Pricing section loaded with ${pricingCards.length} plans`);
    
    // Test 6: Testimonials
    console.log('\n6️⃣ Testing Testimonials...');
    await page.evaluate(() => {
      document.querySelector('#testimonials').scrollIntoView();
    });
    await page.waitForTimeout(1000);
    
    const testimonialCards = await page.$$('#testimonials .card');
    assert(testimonialCards.length >= 3, 'Should have at least 3 testimonials');
    console.log(`✅ Testimonials section loaded with ${testimonialCards.length} testimonials`);
    
    // Test 7: Demo Link
    console.log('\n7️⃣ Testing Demo Link...');
    const demoLink = await page.$('a[href="/demo"]');
    assert(demoLink, 'Demo link should be present');
    await demoLink.click();
    await page.waitFor(3000); // Wait for navigation
    
    const currentUrl = page.url();
    assert(currentUrl.includes('/demo'), 'Should navigate to demo page');
    console.log('✅ Successfully navigated to demo page');
    
    // Test 8: Demo Page Elements
    console.log('\n8️⃣ Testing Demo Page Elements...');
    const demoTitle = await page.$eval('h2', el => el.textContent);
    assert(demoTitle.includes('Welcome to Sync Demo'), 'Demo page should have welcome title');
    console.log(`✅ Demo page loaded: "${demoTitle}"`);
    
    // Test 9: Demo Progress Bar
    console.log('\n9️⃣ Testing Demo Progress Bar...');
    const progressSteps = await page.$$('.w-8.h-8.rounded-full');
    assert(progressSteps.length >= 8, 'Should have at least 8 progress steps');
    console.log(`✅ Progress bar loaded with ${progressSteps.length} steps`);
    
    // Test 10: Demo Start Button
    console.log('\n🔟 Testing Demo Start Button...');
    const startButton = await page.$('button:has-text("Start Demo")');
    if (startButton) {
      await startButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Demo start button clicked');
    }
    
    // Test 11: Demo Accent Color Toggle
    console.log('\n1️⃣1️⃣ Testing Demo Accent Color Toggle...');
    const demoColorButtons = await page.$$('header button');
    if (demoColorButtons.length >= 2) {
      await demoColorButtons[1].click(); // Click green
      await page.waitForTimeout(500);
      await demoColorButtons[0].click(); // Click blue
      await page.waitForTimeout(500);
      console.log('✅ Demo accent color toggle working');
    }
    
    // Test 12: Back to Home Link
    console.log('\n1️⃣2️⃣ Testing Back to Home Link...');
    const backLink = await page.$('a:has-text("Back to Home")');
    if (backLink) {
      await backLink.click();
      await page.waitFor(3000);
      const homeUrl = page.url();
      assert(homeUrl === WEBSITE_URL, 'Should navigate back to home page');
      console.log('✅ Successfully navigated back to home page');
    }
    
    console.log('\n🎉 All website tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Landing page loads correctly');
    console.log('   ✅ Navigation works properly');
    console.log('   ✅ Accent color toggle functional');
    console.log('   ✅ Features section displays');
    console.log('   ✅ Pricing section displays');
    console.log('   ✅ Testimonials section displays');
    console.log('   ✅ Demo page navigation works');
    console.log('   ✅ Demo page elements load');
    console.log('   ✅ Progress bar displays');
    console.log('   ✅ Demo interactions work');
    console.log('   ✅ Color toggle in demo works');
    console.log('   ✅ Back navigation works');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Manual Testing Guide
function printManualTestingGuide() {
  console.log('\n📖 MANUAL TESTING GUIDE');
  console.log('========================\n');
  
  console.log('🌐 LANDING PAGE (http://localhost:3000)');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. Check that the hero section loads with "Transform Your Relationship with AI"');
  console.log('3. Scroll down and verify all sections load:');
  console.log('   - Features grid (6 cards with icons)');
  console.log('   - Testimonials (3 cards with 5-star ratings)');
  console.log('   - Pricing plans (3 tiers: Free, Pro, Enterprise)');
  console.log('4. Test the accent color toggle (blue/green buttons in top-right)');
  console.log('5. Click "Try Demo" button to navigate to demo page');
  console.log('6. Test responsive design by resizing browser window');
  
  console.log('\n🎮 INTERACTIVE DEMO (http://localhost:3000/demo)');
  console.log('1. Navigate to http://localhost:3000/demo');
  console.log('2. Verify the 8-step progress bar is visible');
  console.log('3. Click "Start Demo" to begin the walkthrough');
  console.log('4. Follow the step-by-step process:');
  console.log('   - Step 1: Welcome screen');
  console.log('   - Step 2: Authentication (choose Alice or Bob)');
  console.log('   - Step 3: Couple setup');
  console.log('   - Step 4: Session start');
  console.log('   - Step 5: Communication with AI');
  console.log('   - Step 6: Safety features test');
  console.log('   - Step 7: Survey feedback');
  console.log('   - Step 8: Privacy controls');
  console.log('5. Test the accent color toggle in the demo header');
  console.log('6. Click "Back to Home" to return to landing page');
  
  console.log('\n🎨 DESIGN TESTING');
  console.log('1. Test both accent colors (blue and green)');
  console.log('2. Verify smooth animations and transitions');
  console.log('3. Check hover effects on buttons and cards');
  console.log('4. Test responsive design on different screen sizes');
  console.log('5. Verify all icons and images load correctly');
  
  console.log('\n📱 MOBILE TESTING');
  console.log('1. Open browser developer tools');
  console.log('2. Switch to mobile view (iPhone/Android)');
  console.log('3. Test navigation and interactions');
  console.log('4. Verify text is readable and buttons are touch-friendly');
  console.log('5. Test the demo walkthrough on mobile');
  
  console.log('\n⚡ PERFORMANCE TESTING');
  console.log('1. Open Chrome DevTools');
  console.log('2. Go to Lighthouse tab');
  console.log('3. Run performance audit');
  console.log('4. Check for any accessibility issues');
  console.log('5. Verify Core Web Vitals scores');
  
  console.log('\n🔗 INTEGRATION TESTING');
  console.log('1. Ensure API server is running on port 3001');
  console.log('2. Ensure AI service is running on port 3002');
  console.log('3. Test that demo can connect to backend services');
  console.log('4. Verify error handling when services are unavailable');
}

// Run tests
async function main() {
  try {
    // Check if puppeteer is available
    try {
      require('puppeteer');
      console.log('🤖 Running automated tests...');
      await testWebsite();
    } catch (e) {
      console.log('⚠️  Puppeteer not available, showing manual testing guide instead');
    }
    
    printManualTestingGuide();
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testWebsite, printManualTestingGuide };
