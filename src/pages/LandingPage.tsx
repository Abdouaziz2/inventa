import { useNavigate } from 'react-router-dom';
import LandingNav from '@/components/LandingNav';
import ProblemSection from '@/components/ProblemSection';
import SolutionSection from '@/components/SolutionSection';
import FeaturesSection from '@/components/FeaturesSection';
import SocialProofSection from '@/components/SocialProofSection';
import FinalCTASection from '@/components/FinalCTASection';
import LandingFooter from '@/components/LandingFooter';
import HeroSection from './LandingPage.hero';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleViewDemo = () => {
    const featuresElement = document.getElementById('features');
    if (featuresElement) {
      featuresElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.warn('Features section not found');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingNav onGetStarted={handleGetStarted} />
      <HeroSection onGetStarted={handleGetStarted} onViewDemo={handleViewDemo} />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <SocialProofSection />
      <FinalCTASection onGetStarted={handleGetStarted} onScheduleDemo={handleViewDemo} />
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
