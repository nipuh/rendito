'use client';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 w-full max-w-xs mx-auto">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`
            h-1.5 flex-1 rounded-full transition-all duration-500 ease-out
            ${
              i < currentStep
                ? 'bg-gradient-to-r from-coral to-berry'
                : i === currentStep
                  ? 'bg-gradient-to-r from-coral to-berry animate-pulse'
                  : 'bg-dark-lighter'
            }
          `}
        />
      ))}
    </div>
  );
}
