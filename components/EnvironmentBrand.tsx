'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type BrandContextType = {
  brandName: string | null;
  brandColor: string | null;
  brandLogo: string | null;
  environmentId: string | null;
  setEnvironment: (id: string | null) => void;
};

const BrandContext = createContext<BrandContextType>({
  brandName: null,
  brandColor: null,
  brandLogo: null,
  environmentId: null,
  setEnvironment: () => {},
});

export const useEnvironmentBrand = () => useContext(BrandContext);

export default function EnvironmentBrandProvider({ children }: { children: ReactNode }) {
  const [environmentId, setEnvironment] = useState<string | null>(null);
  const [brand, setBrand] = useState<{ brandName: string | null; brandColor: string | null; brandLogo: string | null }>({
    brandName: null,
    brandColor: null,
    brandLogo: null,
  });

  useEffect(() => {
    if (!environmentId) {
      // Reset to default brand
      document.documentElement.style.setProperty('--brand', '#15AD70');
      document.documentElement.style.setProperty('--brand-soft', 'rgba(21, 173, 112, 0.12)');
      document.documentElement.style.setProperty('--brand-glow', 'rgba(21, 173, 112, 0.08)');
      document.documentElement.style.setProperty('--brand-border', 'rgba(21, 173, 112, 0.2)');
      setBrand({ brandName: null, brandColor: null, brandLogo: null });
      return;
    }

    fetch(`/api/environments/${environmentId}`)
      .then(r => r.json())
      .then(env => {
        if (env.brandColor) {
          // Parse hex to rgb for rgba variants
          const hex = env.brandColor.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);

          document.documentElement.style.setProperty('--brand', env.brandColor);
          document.documentElement.style.setProperty('--brand-soft', `rgba(${r}, ${g}, ${b}, 0.12)`);
          document.documentElement.style.setProperty('--brand-glow', `rgba(${r}, ${g}, ${b}, 0.08)`);
          document.documentElement.style.setProperty('--brand-border', `rgba(${r}, ${g}, ${b}, 0.2)`);
        }
        setBrand({
          brandName: env.brandName ?? null,
          brandColor: env.brandColor ?? null,
          brandLogo: env.brandLogo ?? null,
        });
      })
      .catch(() => {});
  }, [environmentId]);

  return (
    <BrandContext.Provider value={{ ...brand, environmentId, setEnvironment }}>
      {children}
    </BrandContext.Provider>
  );
}
