import React from 'react';

interface Props {
  publishableKey: string;
  children: React.ReactNode;
}

// Web stub: @stripe/stripe-react-native no soporta web (importa internals
// nativos de RN). En web no se monta ningún provider; la integración de
// pagos web debería hacerse con @stripe/stripe-js + Elements en su momento.
export function StripeProviderWrapper({ children }: Props) {
  return <>{children}</>;
}
