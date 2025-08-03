import * as React from 'react';

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    <path d="M12 12h.01" />
    <path d="M22 12h-2" />
    <path d="M14 14l5-5" />
    <path d="M12 2v2" />
    <path d="m7 7 5 5" />
    <path d="M2 12h2" />
    <path d="M12 22v-2" />
  </svg>
);
