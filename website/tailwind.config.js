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
        'neutral-400': '#9CA3AF',      // Medium gray (improved contrast)
        'neutral-500': '#6B7280',      // Text gray (improved contrast)
        'neutral-600': '#4B5563',      // Dark gray text (improved contrast)
        'neutral-700': '#374151',      // Darker text (improved contrast)
        'neutral-800': '#1F2937',      // Very dark text (improved contrast)
        'neutral-900': '#111827',      // Darkest text (improved contrast)
        
        // Gray color mappings (same as neutral for consistency)
        'gray-50': '#FAFAFA',
        'gray-100': '#F5F5F5',
        'gray-200': '#E5E5E5',
        'gray-300': '#D4D4D4',
        'gray-400': '#9CA3AF',
        'gray-500': '#6B7280',
        'gray-600': '#4B5563',
        'gray-700': '#374151',
        'gray-800': '#1F2937',
        'gray-900': '#111827',
        
        // Yellow/Amber colors for warnings
        'yellow-50': '#FFFBEB',
        'yellow-100': '#FEF3C7',
        'yellow-200': '#FDE68A',
        'yellow-500': '#F59E0B',
        'yellow-600': '#D97706',
        'yellow-700': '#B45309',
        'yellow-800': '#92400E',
        
        // Red colors for errors (mapped to amber for softer look)
        'red-50': '#FFFBEB',
        'red-100': '#FEF3C7',
        'red-200': '#FDE68A',
        'red-500': '#F59E0B',
        'red-600': '#D97706',
        'red-700': '#B45309',
        'red-800': '#92400E',
        
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
