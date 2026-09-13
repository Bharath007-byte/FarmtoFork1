import { Check, User, FileText, ShieldAlert, CheckCircle2, Truck, Award } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
}

const STEPS = [
  { step: 1, title: "Personal Info", icon: User },
  { step: 2, title: "Documents", icon: FileText },
  { step: 3, title: "Verification", icon: ShieldAlert },
  { step: 4, title: "Status", icon: CheckCircle2 },
  { step: 5, title: "Vehicle", icon: Truck },
  { step: 6, title: "Approval", icon: Award },
];

export function LogisticsStepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full border-b border-zinc-200/80 bg-white/95 px-4 py-4 shadow-xs backdrop-blur-md">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            const Icon = s.icon;

            return (
              <div key={s.step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200 ${
                      isCompleted
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                        : isCurrent
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-100"
                        : "border-zinc-200 bg-zinc-50 text-zinc-400"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={`mt-1.5 hidden text-[11px] font-semibold md:block ${
                      isCurrent
                        ? "text-emerald-700 font-bold"
                        : isCompleted
                        ? "text-zinc-800"
                        : "text-zinc-400"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 transition-all duration-300 ${
                      currentStep > s.step ? "bg-emerald-600" : "bg-zinc-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile current step indicator label */}
        <div className="mt-2 text-center text-xs font-bold text-emerald-700 md:hidden">
          Step {currentStep} of 6: {STEPS.find((s) => s.step === currentStep)?.title}
        </div>
      </div>
    </div>
  );
}
