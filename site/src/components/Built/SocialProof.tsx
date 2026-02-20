import {
  AdobeLogo,
  AmazonLogo,
  AwgeLogo,
  CNNLogo,
  ConsumerReports,
  CourseraLogo,
  DropboxLogo,
  LinkedinLogo,
  SAPLogo,
  TheOnionLogo,
  UdemyLogo,
  ZoomLogo,
} from '../icons/SocialProofLogos';
import { Marquee } from './Marquee';

export function SocialProof() {
  const LOGOS = [
    { LogoComponent: <AdobeLogo width="6" />, alt: 'Adobe' },
    { LogoComponent: <LinkedinLogo width="6" />, alt: 'Linkedin' },
    { LogoComponent: <UdemyLogo width="6" />, alt: 'Udemy' },
    { LogoComponent: <AmazonLogo width="6" />, alt: 'Amazon' },
    { LogoComponent: <AwgeLogo width="6" />, alt: 'AWGE' },
    { LogoComponent: <ZoomLogo width="6" />, alt: 'Zoom' },
    { LogoComponent: <CourseraLogo width="6" />, alt: 'Coursera' },
    { LogoComponent: <CNNLogo width="6" />, alt: 'CNN' },
    { LogoComponent: <ConsumerReports width="6" />, alt: 'Consumer Reports' },
    { LogoComponent: <TheOnionLogo width="6" />, alt: 'The Onion' },
    { LogoComponent: <SAPLogo width="6" />, alt: 'SAP' },
    { LogoComponent: <DropboxLogo width="6" />, alt: 'Dropbox' },
  ];
  return (
    <div className="bg-faded-black border border-dark-manila z-1 overflow-hidden -mb-10 relative col-span-full rounded-sm">
      <header>
        <Marquee />
      </header>
      <div className="relative grid grid-cols-6 grid-rows-2 gap-0 z-0 -m-px">
        {LOGOS.map((logo) => (
          <div key={logo.alt} className="grid-separators relative flex items-center justify-center h-40">
            {logo.LogoComponent}
          </div>
        ))}
      </div>
    </div>
  );
}
