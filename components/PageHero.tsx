import React from 'react';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  image?: string;
}

export default function PageHero({ title, subtitle, image }: PageHeroProps) {
  return (
    <div className="relative overflow-hidden bg-[#1e40af]">
      {image ? (
        <>
          <img
            src={image}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#1e40af]/70" />
        </>
      ) : (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[#1e40af]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(96,165,250,0.12),transparent_40%)]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-in slide-in-from-bottom-4 duration-700">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl md:text-2xl text-[#F3F3F3]/80 max-w-3xl mx-auto leading-relaxed animate-in slide-in-from-bottom-5 duration-700 delay-100">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
