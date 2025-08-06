
import * as React from 'react';
import Image from 'next/image';

export const Logo = (props: React.ComponentProps<'div'>) => (
  <div {...props}>
    <Image
      src="/logo.png"
      alt="Flous Dart Logo"
      width={64}
      height={64}
      className="h-full w-full"
    />
  </div>
);
