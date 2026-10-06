"use client";

import { useEffect } from "react";

export function ReferralTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");

    if (refCode && refCode.trim().length > 0) {
      const cleanedCode = refCode.trim().toUpperCase();
      // Store in localStorage
      localStorage.setItem("subsdealer_ref_code", cleanedCode);
      
      // Store in cookie for 30 days
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      document.cookie = `subsdealer_ref_code=${cleanedCode}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }
  }, []);

  return null;
}

export default ReferralTracker;
