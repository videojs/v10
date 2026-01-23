import { AtSign, Github, Globe, Linkedin, Twitter } from 'lucide-react';
import { Fragment } from 'react';
import { Tooltip, TooltipProvider } from '../Tooltip';

interface SocialLinks {
  website?: string;
  github?: string;
  linkedin?: string;
  bluesky?: string;
  mastodon?: string;
  x?: string;
}

export interface AuthorSocialLinksProps {
  socialLinks: SocialLinks;
  className?: string;
}

const SOCIAL_CONFIGS = {
  website: {
    icon: Globe,
    label: 'Website',
  },
  github: {
    icon: Github,
    label: 'GitHub',
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
  },
  bluesky: {
    icon: AtSign,
    label: 'Bluesky',
  },
  mastodon: {
    icon: AtSign,
    label: 'Mastodon',
  },
  x: {
    icon: Twitter,
    label: 'X',
  },
} as const;

export function AuthorSocialLinks({ socialLinks, className }: AuthorSocialLinksProps) {
  const links = Object.entries(socialLinks).filter(([_, url]) => url) as Array<[keyof SocialLinks, string]>;

  if (links.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <ul className={className}>
        {links.map(([platform, url]) => {
          const config = SOCIAL_CONFIGS[platform];
          if (!config) return <Fragment key={platform} />;

          const Icon = config.icon;

          return (
            <li key={platform}>
              <Tooltip content={config.label}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${config.label} profile`}
                  className="inline-flex items-center justify-center p-2 rounded-lg intent:text-dark-40 dark:text-light-40"
                >
                  <Icon size={20} strokeWidth={1.5} />
                </a>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </TooltipProvider>
  );
}
