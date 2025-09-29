'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Shield, 
  Brain, 
  MessageCircle, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Star,
  Zap,
  Lock,
  Eye,
  Trash2
} from 'lucide-react';

export default function HomePage() {
  const [accentColor, setAccentColor] = useState<'blue' | 'green'>('blue');

  const features = [
    {
      icon: Users,
      title: 'Two Powerful Modes',
      description: 'Choose between "Talk Together" (Couple) or "Reflect Alone" (Solo) sessions for different communication needs.',
      color: 'blue'
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Get intelligent reflections and guidance tailored to your chosen mode - couple facilitation or solo reflection.',
      color: 'green'
    },
    {
      icon: MessageCircle,
      title: 'Real-time Communication',
      description: 'Secure, encrypted messaging with long-polling for instant communication and turn-taking.',
      color: 'blue'
    },
    {
      icon: Shield,
      title: 'Advanced Safety',
      description: 'Tier-1 safety pre-checks, boundary detection, and EU compliance with privacy protection.',
      color: 'green'
    },
    {
      icon: Heart,
      title: 'Solo to Couple Flow',
      description: 'Seamlessly convert solo reflections into couple sessions with privacy controls and consent.',
      color: 'blue'
    },
    {
      icon: Lock,
      title: 'Privacy & Security',
      description: 'GDPR/CCPA compliant with audit logging, data encryption, and hard delete functionality.',
      color: 'green'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah & Michael',
      text: 'The couple mode helps us communicate better, while solo mode lets us reflect privately. Perfect balance!',
      rating: 5
    },
    {
      name: 'Emma & David',
      text: 'Love how we can start with solo reflection and then convert to couple sessions. The AI insights are incredible.',
      rating: 5
    },
    {
      name: 'Lisa & James',
      text: 'The safety features and privacy controls give us complete confidence. Finally, a tool that truly understands couples.',
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      features: [
        'Both Couple & Solo modes',
        'Up to 10 sessions/month',
        'Basic AI insights',
        'Standard safety features',
        'Community support'
      ],
      color: 'blue'
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/month',
      features: [
        'Unlimited Couple & Solo sessions',
        'Advanced AI insights',
        'Solo to Couple conversion',
        'Premium safety features',
        'Priority support',
        'Analytics dashboard'
      ],
      color: 'green',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      features: [
        'Custom AI models for both modes',
        'White-label solution',
        'Advanced privacy controls',
        'Dedicated support',
        'Custom integrations',
        'Audit logging & compliance'
      ],
      color: 'blue'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-neutral-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className={`h-8 w-8 ${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`} />
              <span className="text-xl font-bold text-neutral-900">Sync</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                Pricing
              </Link>
              <Link href="#testimonials" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                Testimonials
              </Link>
              <Link 
                href="/session" 
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  accentColor === 'blue' 
                    ? 'bg-blue-primary hover:bg-blue-secondary text-white' 
                    : 'bg-green-primary hover:bg-green-secondary text-white'
                }`}
              >
                Try Demo
              </Link>
            </div>

            {/* Accent Color Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAccentColor('blue')}
                className={`w-6 h-6 rounded-full border-2 ${
                  accentColor === 'blue' ? 'border-blue-primary bg-blue-primary' : 'border-blue-300'
                }`}
              />
              <button
                onClick={() => setAccentColor('green')}
                className={`w-6 h-6 rounded-full border-2 ${
                  accentColor === 'green' ? 'border-green-primary bg-green-primary' : 'border-green-300'
                }`}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.h1 
              className="text-5xl md:text-7xl font-bold text-neutral-900 mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Transform Your{' '}
              <span className={`${accentColor === 'blue' ? 'text-blue-primary' : 'text-green-primary'}`}>
                Relationship
              </span>
              <br />
              with AI
            </motion.h1>
            
            <motion.p 
              className="text-xl text-neutral-700 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Sync is the first AI-powered communication platform with two powerful modes: "Talk Together" for couples 
              and "Reflect Alone" for solo reflection. Get intelligent insights, safety boundaries, and seamless 
              conversion between modes to deepen your connection.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link 
                href="/session"
                className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all shadow-lg hover:shadow-xl ${
                  accentColor === 'blue' 
                    ? 'bg-blue-primary hover:bg-blue-secondary text-white' 
                    : 'bg-green-primary hover:bg-green-secondary text-white'
                }`}
              >
                Try Free Demo
                <ArrowRight className="inline-block ml-2 h-5 w-5" />
              </Link>
              
              <button className="px-8 py-4 rounded-lg font-semibold text-lg text-neutral-700 bg-white border-2 border-neutral-300 hover:border-neutral-400 transition-all">
                Watch Demo
              </button>
            </motion.div>
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
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex p-4 rounded-full bg-blue-light mb-6">
                <Users className="h-8 w-8 text-blue-primary" />
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
                  <CheckCircle className="h-5 w-5 text-blue-primary mr-3" />
                  <span>Turn-taking facilitation</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-primary mr-3" />
                  <span>Couple-focused AI insights</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-primary mr-3" />
                  <span>Real-time communication</span>
                </li>
              </ul>
              <div className="text-sm text-blue-primary font-semibold">
                Perfect for: Active couples communication
              </div>
            </motion.div>

            {/* Solo Mode */}
            <motion.div
              className="card text-center"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="inline-flex p-4 rounded-full bg-green-light mb-6">
                <Brain className="h-8 w-8 text-green-primary" />
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
                  <CheckCircle className="h-5 w-5 text-green-primary mr-3" />
                  <span>Personal reflection space</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-primary mr-3" />
                  <span>Solo-focused AI guidance</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-primary mr-3" />
                  <span>Convert to couple sessions</span>
                </li>
              </ul>
              <div className="text-sm text-green-primary font-semibold">
                Perfect for: Personal growth & reflection
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4 leading-tight">
              Advanced Features
            </h2>
            <p className="text-xl text-neutral-700 max-w-3xl mx-auto leading-relaxed">
              Built with privacy, safety, and AI at its core. Experience the future of communication.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="card hover:scale-105"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className={`inline-flex p-3 rounded-lg mb-4 ${
                  feature.color === 'blue' ? 'bg-blue-light' : 'bg-green-light'
                }`}>
                  <feature.icon className={`h-6 w-6 ${
                    feature.color === 'blue' ? 'text-blue-primary' : 'text-green-primary'
                  }`} />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-neutral-700 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-4 sm:px-6 lg:px-8 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4 leading-tight">
              Loved by Couples Worldwide
            </h2>
            <p className="text-xl text-neutral-700 leading-relaxed">
              See what couples are saying about Sync
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-neutral-700 mb-4 italic leading-relaxed">
                  "{testimonial.text}"
                </p>
                <p className="font-semibold text-neutral-900 leading-tight">
                  {testimonial.name}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4 leading-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-neutral-700 leading-relaxed">
              Choose the plan that's right for your relationship
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                className={`card relative ${plan.popular ? 'ring-2 ring-blue-primary scale-105' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-neutral-900 mb-2 leading-tight">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-neutral-900">
                      {plan.price}
                    </span>
                    <span className="text-neutral-700 ml-1">
                      {plan.period}
                    </span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className={`h-5 w-5 mr-3 ${
                        plan.color === 'blue' ? 'text-blue-primary' : 'text-green-primary'
                      }`} />
                      <span className="text-neutral-700 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  plan.color === 'blue' 
                    ? 'bg-blue-primary hover:bg-blue-secondary text-white' 
                    : 'bg-green-primary hover:bg-green-secondary text-white'
                }`}>
                  Get Started
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Ready to Transform Your Communication?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Choose between "Talk Together" or "Reflect Alone" modes. Join thousands of users who are already 
            using Sync to communicate better and grow together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/session"
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
            >
              Try Couple Mode
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/session"
              className="inline-flex items-center px-8 py-4 bg-green-500 text-white rounded-lg font-semibold text-lg hover:bg-green-600 transition-all shadow-lg hover:shadow-xl"
            >
              Try Solo Mode
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-6 w-6 text-blue-primary" />
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
