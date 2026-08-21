import React from 'react';
import LandingNavbar from '../landing/LandingNavbar';
import HeroSection from '../landing/HeroSection';
import ProblemSection from '../landing/ProblemSection';
import SolutionSection from '../landing/SolutionSection';
import BenefitsSection from '../landing/BenefitsSection';
import HowItWorksSection from '../landing/HowItWorksSection';
import CoreFeaturesSection from '../landing/CoreFeaturesSection';
import AiCopilotSection from '../landing/AiCopilotSection';
import ProductShowcaseSection from '../landing/ProductShowcaseSection';
import BudgetDeepDiveSection from '../landing/BudgetDeepDiveSection';
import SecuritySection from '../landing/SecuritySection';
import TechStackSection from '../landing/TechStackSection';
import FinalCtaSection from '../landing/FinalCtaSection';
import LandingFooter from '../landing/LandingFooter';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onStartDemo: () => void;
  isLoggedIn: boolean;
  userName?: string | null;
}

export default function LandingPage({
  onOpenLogin,
  onOpenRegister,
  onStartDemo,
  isLoggedIn,
  userName,
}: LandingPageProps) {
  
  const handlePrimaryCta = () => {
    if (isLoggedIn) {
      onStartDemo();
    } else {
      onOpenRegister();
    }
  };

  const handleExploreFeatures = () => {
    const el = document.getElementById('features');
    if (el) {
      const navOffset = 70;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col font-sans selection:bg-amber-200 selection:text-emerald-950">
      
      {/* 13. Sticky Navbar with Brand, Links, Mobile Menu, and Quick Actions */}
      <LandingNavbar
        onOpenLogin={onOpenLogin}
        onOpenRegister={onOpenRegister}
        onStartDemo={onStartDemo}
        isLoggedIn={isLoggedIn}
        userName={userName}
      />

      <main className="flex-1">
        {/* 1. Hero Section with Real Application Visual, Exact Copy, & Conversion Triggers */}
        <HeroSection
          onStart={handlePrimaryCta}
          onDemo={onStartDemo}
          isLoggedIn={isLoggedIn}
          userName={userName}
        />

        {/* 2. Problem Section (Empathetic pain points, non-academic) */}
        <ProblemSection />

        {/* 3. Solution Section (Unified management for income, expenses, wallets, budget, goals, reports, AI) */}
        <SolutionSection />

        {/* 4. Core Value & Benefits (4 key user-first benefits) */}
        <BenefitsSection />

        {/* 5. How It Works (4-step stepper timeline) */}
        <HowItWorksSection />

        {/* 6. Core Features Hierarchy (Core vs Secondary tools) */}
        <CoreFeaturesSection />

        {/* 7. AI Copilot Interactive Live Demonstration (WOW Moment, conversation breakdown) */}
        <AiCopilotSection onTryChatbot={onStartDemo} />

        {/* 8. Product Showcase (Interactive mockup tabs: Dashboard, Transactions, Budget, Reports, AI Copilot) */}
        <ProductShowcaseSection />

        {/* 9. Budget Section (50/30/20 Deep Dive & Interactive Income Simulator) */}
        <BudgetDeepDiveSection />

        {/* 10. Security & Privacy (Financial-grade trust badges, Bcrypt, double tokens, data ownership) */}
        <SecuritySection />

        {/* 11. Technology Stack (Modern, condensed badges grouped cleanly) */}
        <TechStackSection />

        {/* 12. Final High-Converting CTA */}
        <FinalCtaSection
          onStart={handlePrimaryCta}
          onExploreFeatures={handleExploreFeatures}
          isLoggedIn={isLoggedIn}
          userName={userName}
        />
      </main>

      {/* Footer */}
      <LandingFooter />

    </div>
  );
}
