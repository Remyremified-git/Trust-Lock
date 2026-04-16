"use client";

import Lottie from "lottie-react";
import securePulseAnimation from "@/lottie/secure-pulse.json";

export default function TrustLockHeroMotion() {
  return (
    <div className="lottie-shell" aria-hidden="true">
      <Lottie
        animationData={securePulseAnimation}
        loop
        autoplay
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
    </div>
  );
}

