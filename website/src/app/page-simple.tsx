'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [accentColor, setAccentColor] = useState<'blue' | 'green'>('blue');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-neutral-900 mb-6 leading-tight">
              Transform Your{' '}
              <span className={accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}>
                Relationship
              </span>
              <br />
              with AI
            </h1>
            
            <p className="text-xl text-neutral-700 mb-8 max-w-3xl mx-auto leading-relaxed">
              Sync is the first AI-powered communication platform with two powerful modes: "Talk Together" for couples 
              and "Reflect Alone" for solo reflection. Get intelligent insights, safety boundaries, and seamless 
              conversion between modes to deepen your connection.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/session"
                className="inline-flex items-center px-8 py-4 bg-blue-primary text-white rounded-lg font-semibold text-lg hover:bg-blue-secondary transition-all shadow-lg hover:shadow-xl"
              >
                Try Couple Mode
                <span className="ml-2">→</span>
              </Link>
              <Link 
                href="/session"
                className="inline-flex items-center px-8 py-4 bg-green-primary text-white rounded-lg font-semibold text-lg hover:bg-green-secondary transition-all shadow-lg hover:shadow-xl"
              >
                Try Solo Mode
                <span className="ml-2">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Modes Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4 leading-tight">
              Choose Your Communication Style
            </h2>
            <p className="text-xl text-neutral-700 max-w-3xl mx-auto leading-relaxed">
              Two powerful modes designed for different communication needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Couple Mode */}
            <div className="card text-center">
              <div className="inline-flex p-4 rounded-full bg-blue-light mb-6">
                <span className="h-8 w-8 text-blue-primary">👥</span>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-4 leading-tight">
                Talk Together
              </h3>
              <p className="text-neutral-700 mb-6 leading-relaxed">
                Perfect for couples who want to communicate and grow together. 
                AI facilitates turn-taking and provides insights to deepen your connection.
              </p>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="h-5 w-5 text-blue-primary mr-3">✓</span>
                  <span>Turn-taking facilitation</span>
                </li>
                <li className="flex items-center">
                  <span className="h-5 w-5 text-blue-primary mr-3">✓</span>
                  <span>Real-time communication</span>
                </li>
                <li className="flex items-center">
                  <span className="h-5 w-5 text-blue-primary mr-3">✓</span>
                  <span>Conflict resolution support</span>
                </li>
              </ul>
              <div className="flex items-center justify-center space-x-4 text-sm text-neutral-600">
                <span className="flex items-center">
                  <span className="mr-1">🛡️</span>
                  Privacy Protected
                </span>
                <span className="flex items-center">
                  <span className="mr-1">🔒</span>
                  Encrypted
                </span>
              </div>
            </div>

            {/* Solo Mode */}
            <div className="card text-center">
              <div className="inline-flex p-4 rounded-full bg-green-light mb-6">
                <span className="h-8 w-8 text-green-primary">🧠</span>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-4 leading-tight">
                Reflect Alone
              </h3>
              <p className="text-neutral-700 mb-6 leading-relaxed">
                Ideal for personal reflection and self-discovery. 
                AI provides gentle guidance and insights to help you understand yourself better.
              </p>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="h-5 w-5 text-green-primary mr-3">✓</span>
                  <span>Personal reflection space</span>
                </li>
                <li className="flex items-center">
                  <span className="h-5 w-5 text-green-primary mr-3">✓</span>
                  <span>AI-guided self-discovery</span>
                </li>
                <li className="flex items-center">
                  <span className="h-5 w-5 text-green-primary mr-3">✓</span>
                  <span>Convert to couple when ready</span>
                </li>
              </ul>
              <div className="flex items-center justify-center space-x-4 text-sm text-neutral-600">
                <span className="flex items-center">
                  <span className="mr-1">🛡️</span>
                  Private & Secure
                </span>
                <span className="flex items-center">
                  <span className="mr-1">🔒</span>
                  Encrypted
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="h-6 w-6 text-blue-primary">❤️</span>
                <span className="text-xl font-bold">Sync</span>
              </div>
              <p className="text-neutral-500 leading-relaxed">
                AI-powered communication with two modes: "Talk Together" for couples and "Reflect Alone" for solo reflection.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-neutral-500">
                <li><Link href="#features" className="hover:text-white transition-colors leading-relaxed">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors leading-relaxed">Pricing</Link></li>
                <li><Link href="/session" className="hover:text-white transition-colors leading-relaxed">Try Demo</Link></li>
                <li><Link href="/session" className="hover:text-white transition-colors leading-relaxed">Couple Mode</Link></li>
                <li><Link href="/session" className="hover:text-white transition-colors leading-relaxed">Solo Mode</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-neutral-500">
                <li><Link href="#" className="hover:text-white transition-colors leading-relaxed">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors leading-relaxed">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors leading-relaxed">Terms</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-neutral-500">
                <li><Link href="#" className="hover:text-white transition-colors leading-relaxed">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors leading-relaxed">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors leading-relaxed">Status</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-neutral-800 mt-8 pt-8 text-center text-neutral-500">
            <p className="leading-relaxed">&copy; 2024 Sync. All rights reserved. Built with privacy and safety at its core.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
