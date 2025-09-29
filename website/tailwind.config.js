/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Blue accent variant - improved contrast
        'blue-primary': '#2563EB',      // More vibrant blue
        'blue-secondary': '#1D4ED8',    // Darker blue for better contrast
        'blue-accent': '#3B82F6',       // Lighter blue for accents
        'blue-light': '#EFF6FF',        // Very light blue background
        'blue-dark': '#1E40AF',         // Dark blue for text
        'blue-50': '#F0F9FF',           // Lightest blue
        'blue-100': '#E0F2FE',          // Light blue
        
        // Green accent variant - improved contrast
        'green-primary': '#059669',     // More vibrant green
        'green-secondary': '#047857',   // Darker green for better contrast
        'green-accent': '#10B981',      // Lighter green for accents
        'green-light': '#ECFDF5',       // Very light green background
        'green-dark': '#064E3B',        // Dark green for text
        'green-50': '#F0FDF4',          // Lightest green
        'green-100': '#DCFCE7',         // Light green
        
        // Enhanced neutral colors for better readability
        'neutral-50': '#FAFAFA',        // Pure white background
        'neutral-100': '#F5F5F5',       // Light gray
        'neutral-200': '#E5E5E5',      // Border gray
        'neutral-300': '#D4D4D4',      // Light gray
        'neutral-400': '#A3A3A3',      // Medium gray
        'neutral-500': '#737373',      // Text gray
        'neutral-600': '#525252',      // Dark gray text
        'neutral-700': '#404040',      // Darker text
        'neutral-800': '#262626',      // Very dark text
        'neutral-900': '#171717',      // Darkest text
        
        // Additional semantic colors
        'text-primary': '#1F2937',     // Primary text color
        'text-secondary': '#6B7280',   // Secondary text color
        'text-muted': '#9CA3AF',       // Muted text color
        'background': '#FFFFFF',       // Main background
        'background-secondary': '#F9FAFB', // Secondary background
        'border': '#E5E7EB',           // Border color
        'border-light': '#F3F4F6',     // Light border
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
