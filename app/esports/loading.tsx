import Image from "react";

export default function Loading() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
      <div className="bax-loader rounded-full border border-black/10 h-[50px] w-[50px] overflow-hidden">
        {/* We use an img tag for simplicity within the loader, since next/image needs src known or relative to public */}
        <img
          src="/bax.png"
          alt="Loading records..."
          className="h-full w-full object-cover"
        />
      </div>
      <p className="eyebrow animate-pulse">Fetching records...</p>
    </div>
  );
}
