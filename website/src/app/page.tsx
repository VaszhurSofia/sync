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
      icon: Brain,
      title: 'AI-Powered Reflection',
      description: 'Get intelligent insights and reflections on your conversations to deepen understanding.',
      color: 'blue'
    },
    {
      icon: MessageCircle,
      title: 'Real-time Communication',
      description: 'Secure, encrypted messaging with long-polling for instant communication.',
      color: 'green'
    },
    {
      icon: Shield,
      title: 'Enterprise Safety',
      description: 'Advanced safety boundaries, EU compliance, and privacy protection built-in.',
      color: 'blue'
    },
    {
      icon: Users,
      title: 'Couple Management',
      description: 'Easy couple creation, invites, and session management for seamless collaboration.',
      color: 'green'
    },
    {
      icon: Heart,
      title: 'Relationship Insights',
      description: '3-emoji feedback system with analytics to track relationship health.',
      color: 'blue'
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'GDPR/CCPA compliant with hard delete functionality and audit logging.',
      color: 'green'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah & Michael',
      text: 'Sync has transformed how we communicate. The AI insights help us understand each other better.',
      rating: 5
    },
    {
      name: 'Emma & David',
      text: 'The safety features give us peace of mind, and the feedback system helps us track our progress.',
      rating: 5
    },
    {
      name: 'Lisa & James',
      text: 'Finally, a communication tool that respects our privacy while helping us grow together.',
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      features: [
        'Basic AI reflection',
        'Up to 10 sessions/month',
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
        'Advanced AI insights',
        'Unlimited sessions',
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
        'Custom AI models',
        'White-label solution',
        'Dedicated support',
        'Advanced compliance',
        'Custom integrations'
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
                href="/demo" 
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
              className="text-5xl md:text-7xl font-bold text-neutral-900 mb-6"
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
              className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Sync is the first AI-powered communication platform designed specifically for couples. 
              Get intelligent insights, safety boundaries, and privacy-first design to deepen your connection.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link 
                href="/demo"
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

      {/* Features Section */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Everything You Need for Better Communication
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Built with privacy, safety, and AI at its core. Experience the future of couple communication.
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
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-600">
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
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Loved by Couples Worldwide
            </h2>
            <p className="text-xl text-neutral-600">
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
                <p className="text-neutral-600 mb-4 italic">
                  "{testimonial.text}"
                </p>
                <p className="font-semibold text-neutral-900">
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
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-neutral-600">
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
                  <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-neutral-900">
                      {plan.price}
                    </span>
                    <span className="text-neutral-600 ml-1">
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
                      <span className="text-neutral-600">{feature}</span>
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
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Relationship?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of couples who are already using Sync to communicate better.
          </p>
          <Link 
            href="/demo"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
          >
            Start Your Free Demo
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
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
              <p className="text-neutral-400">
                AI-powered communication for couples who want to grow together.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-neutral-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/demo" className="hover:text-white transition-colors">Demo</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-neutral-400">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-neutral-400">
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-neutral-800 mt-8 pt-8 text-center text-neutral-400">
            <p>&copy; 2024 Sync. All rights reserved. Built with privacy and safety at its core.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
