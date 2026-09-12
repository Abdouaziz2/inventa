import { useNavigate } from 'react-router-dom';
import LandingNav from '@/components/LandingNav';
import ProblemSection from '@/components/ProblemSection';
import SolutionSection from '@/components/SolutionSection';
import FeaturesSection from '@/components/FeaturesSection';
import ProductDemoSection from '@/components/ProductDemoSection';
import SocialProofSection from '@/components/SocialProofSection';
import PricingSection from '@/components/PricingSection';
import FAQSection from '@/components/FAQSection';
import FinalCTASection from '@/components/FinalCTASection';
import AccessRequestSection from '@/components/AccessRequestSection';
import LandingFooter from '@/components/LandingFooter';
import HeroSection from './LandingPage.hero';
import { DEMO_VIDEO_URL } from '@/lib/demo';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleViewDemo = () => {
    if (DEMO_VIDEO_URL) {
      window.open(DEMO_VIDEO_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    const demoElement = document.getElementById('demo');
    if (demoElement) {
      demoElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      const featuresElement = document.getElementById('features');
      if (featuresElement) {
        featuresElement.scrollIntoView({ behavior: 'smooth' });
      } else {
        console.warn('Demo section not found');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingNav onGetStarted={handleGetStarted} />
      <HeroSection onGetStarted={handleGetStarted} onViewDemo={handleViewDemo} />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <ProductDemoSection />
      <SocialProofSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection onGetStarted={handleGetStarted} onScheduleDemo={handleViewDemo} />
      <AccessRequestSection onGoToLogin={handleGetStarted} onOpenApp={() => navigate('/dashboard')} />
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
