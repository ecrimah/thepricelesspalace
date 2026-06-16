interface CheckoutStepsProps {
  currentStep: number;
}

export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const steps = [
    { number: 1, title: 'Shipping', icon: 'ri-map-pin-line' },
    { number: 2, title: 'Delivery', icon: 'ri-truck-line' },
    { number: 3, title: 'Payment', icon: 'ri-bank-card-line' }
  ];

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div className={`w-12 h-12 flex items-center justify-center rounded-full font-bold transition-all duration-300 ${
              currentStep >= step.number
                ? 'bg-gradient-to-br from-[#C9A24E] to-[#9C7A2E] text-white shadow-[0_10px_22px_-10px_rgba(201,162,78,0.95)]'
                : 'bg-[#141414]/[0.06] text-[#141414]/40'
            }`}>
              <i className={`${step.icon} text-xl`}></i>
            </div>
            <p className={`mt-2 text-sm font-semibold ${
              currentStep >= step.number ? 'text-[#141414]' : 'text-[#141414]/40'
            }`}>
              {step.title}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mx-4 rounded-full transition-colors ${
              currentStep > step.number ? 'bg-gradient-to-r from-[#C9A24E] to-[#9C7A2E]' : 'bg-[#141414]/10'
            }`}></div>
          )}
        </div>
      ))}
    </div>
  );
}
