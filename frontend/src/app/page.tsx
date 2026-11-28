/* eslint-disable @next/next/no-css-tags */
import { HomeLandingPage } from '@/shared/components/HomeLandingPage';

export default function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/assets/system.css" precedence="taste-1" />
      <link rel="stylesheet" href="/assets/ui/cards.css" precedence="taste-2" />
      <link rel="stylesheet" href="/assets/motion/motion.css" precedence="taste-3" />
      <link rel="stylesheet" href="/assets/backgrounds/backgrounds.css" precedence="taste-4" />
      <link rel="stylesheet" href="/assets/layout/layout.css" precedence="taste-5" />
      <link rel="stylesheet" href="/assets/diagrams/diagram.css" precedence="taste-6" />
      <link rel="stylesheet" href="/assets/moments/giant-type-pass/moment.css" precedence="taste-7" />
      <link rel="stylesheet" href="/assets/skyroute-landing.css" precedence="taste-8" />
      <HomeLandingPage />
    </>
  );
}
