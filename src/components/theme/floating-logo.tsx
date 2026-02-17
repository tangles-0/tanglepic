"use client";

import { useEffect, useState } from "react";

export const FloatingLogo = () => {
  const [numClicks, setNumClicks] = useState(0);
  const [easterEggActivated, setEasterEggActivated] = useState(false);
  useEffect(() => {
    if (numClicks == 5) {
      setEasterEggActivated(true);
      setNumClicks(0);
      setTimeout(() => {
        setEasterEggActivated(false);
      }, 1000);
    }
  }, [numClicks]);
  return (
    <div className={`fixed bottom-0 right-0 z-10 z-5 ${easterEggActivated ? "easter-egg" : ""}`}
      onClick={() => {
        setNumClicks(numClicks + 1);
      }}>
      <img src="/latex-logo.png" alt="LaTeX logo" width="48" className={`latex-logo ${easterEggActivated ? "easter-egg" : ""}`} />
    </div>
  );
};