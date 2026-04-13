
// src/hooks/use-mobile.tsx
"use client";
import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Initialize state to `false` on the server to prevent mismatches.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // This effect only runs on the client.
    const checkIsMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

    // Set the initial value on the client after the first render.
    setIsMobile(checkIsMobile());

    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
