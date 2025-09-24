#!/usr/bin/env node

/**
 * Pseudo-Localization Tool
 * Generates pseudo-localized strings to test UI layout and text expansion
 */

const fs = require('fs');
const path = require('path');

class PseudoLocalizationTool {
  constructor() {
    this.expansionFactor = 1.4; // 40% expansion
    this.characterMap = {
      'a': 'å', 'e': 'ë', 'i': 'ï', 'o': 'ø', 'u': 'ü',
      'A': 'Å', 'E': 'Ë', 'I': 'Ï', 'O': 'Ø', 'U': 'Ü',
      'c': 'ç', 'n': 'ñ', 's': 'ß', 'y': 'ÿ'
    };
  }

  /**
   * Pseudo-localize a string
   */
  pseudoLocalize(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Apply character mapping
    let pseudoText = text;
    for (const [original, pseudo] of Object.entries(this.characterMap)) {
      pseudoText = pseudoText.replace(new RegExp(original, 'g'), pseudo);
    }
    
    // Add expansion if needed
    if (pseudoText.length < text.length * this.expansionFactor) {
      const expansion = ' ' + 'x'.repeat(Math.ceil(text.length * (this.expansionFactor - 1)));
      pseudoText += expansion;
    }
    
    return pseudoText;
  }

  /**
   * Process a JSON object with pseudo-localization
   */
  processObject(obj) {
    if (typeof obj === 'string') {
      return this.pseudoLocalize(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.processObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.processObject(value);
      }
      return result;
    }
    
    return obj;
  }

  /**
   * Generate pseudo-localized version of translation files
   */
  generatePseudoLocalization() {
    const localesDir = path.join(__dirname, '../packages/ui/src/i18n/locales');
    const outputDir = path.join(__dirname, '../packages/ui/src/i18n/locales-pseudo');
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Process each locale file
    const localeFiles = fs.readdirSync(localesDir).filter(file => file.endsWith('.json'));
    
    for (const file of localeFiles) {
      const filePath = path.join(localesDir, file);
      const outputPath = path.join(outputDir, file);
      
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const pseudoContent = this.processObject(content);
        
        fs.writeFileSync(outputPath, JSON.stringify(pseudoContent, null, 2));
        console.log(`✅ Generated pseudo-localization for ${file}`);
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }
  }

  /**
   * Test UI layout with pseudo-localization
   */
  testUILayout() {
    const testStrings = [
      'How was your session?',
      'Send message',
      'Waiting for your partner',
      'Your conversation has ended',
      'Professional help is available',
      'Delete your account',
      'Manage your notifications',
      'Choose your language',
      'Your privacy settings',
      'Connection lost. Attempting to reconnect...'
    ];
    
    console.log('\n🧪 Pseudo-Localization Test Results:');
    console.log('='.repeat(50));
    
    testStrings.forEach(original => {
      const pseudo = this.pseudoLocalize(original);
      const expansion = ((pseudo.length / original.length - 1) * 100).toFixed(1);
      
      console.log(`\nOriginal:  "${original}"`);
      console.log(`Pseudo:    "${pseudo}"`);
      console.log(`Expansion: ${expansion}%`);
      
      // Check for layout issues
      if (pseudo.length > original.length * 1.5) {
        console.log(`⚠️  Warning: High expansion may cause layout issues`);
      }
    });
  }

  /**
   * Generate test data for different languages
   */
  generateTestData() {
    const testData = {
      english: {
        short: 'Hi',
        medium: 'How was your session?',
        long: 'Your conversation has been saved and you can access it anytime.',
        veryLong: 'We understand that relationships can be challenging, and we want to provide a safe space for you to communicate with your partner.'
      },
      german: {
        short: 'Hallo',
        medium: 'Wie war Ihre Sitzung?',
        long: 'Ihr Gespräch wurde gespeichert und Sie können jederzeit darauf zugreifen.',
        veryLong: 'Wir verstehen, dass Beziehungen herausfordernd sein können, und wir möchten Ihnen einen sicheren Raum bieten, um mit Ihrem Partner zu kommunizieren.'
      },
      pseudo: {
        short: this.pseudoLocalize('Hi'),
        medium: this.pseudoLocalize('How was your session?'),
        long: this.pseudoLocalize('Your conversation has been saved and you can access it anytime.'),
        veryLong: this.pseudoLocalize('We understand that relationships can be challenging, and we want to provide a safe space for you to communicate with your partner.')
      }
    };
    
    const outputPath = path.join(__dirname, '../test-data/localization-test.json');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));
    console.log(`\n📄 Test data saved to: ${outputPath}`);
  }

  /**
   * Run comprehensive pseudo-localization tests
   */
  runTests() {
    console.log('🌍 Starting Pseudo-Localization Tests...\n');
    
    // Generate pseudo-localization files
    this.generatePseudoLocalization();
    
    // Test UI layout
    this.testUILayout();
    
    // Generate test data
    this.generateTestData();
    
    console.log('\n✅ Pseudo-localization tests completed!');
    console.log('\n💡 Next steps:');
    console.log('  1. Review generated pseudo-localization files');
    console.log('  2. Test UI layout with expanded text');
    console.log('  3. Adjust CSS for text expansion');
    console.log('  4. Test with real German translations');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tool = new PseudoLocalizationTool();
  tool.runTests();
}

module.exports = PseudoLocalizationTool;
