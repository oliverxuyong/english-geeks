const STEPS = [
  { id: "step-vocab", label: "1" },
  { id: "step-listen-1", label: "2" },
  { id: "step-practice", label: "3" },
  { id: "step-listen-2", label: "4" },
];

export function StepNav() {
  function scrollToStep(stepId) {
    document.getElementById(stepId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="step-nav" aria-label="Lesson steps">
      {STEPS.map((step) => (
        <button
          key={step.id}
          type="button"
          className="step-nav-button"
          onClick={() => scrollToStep(step.id)}
          title={`Go to step ${step.label}`}
        >
          {step.label}
        </button>
      ))}
    </nav>
  );
}
