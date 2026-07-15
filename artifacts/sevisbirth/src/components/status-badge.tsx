import { cva } from "class-variance-authority";

export const stateColors = cva("inline-flex items-center gap-1.5", {
  variants: {
    state: {
      draft: "text-zinc-400",
      submitted: "text-blue-400",
      received: "text-indigo-400",
      reviewing: "text-amber-400",
      approved: "text-green-400",
      rejected: "text-red-400",
      certifying: "text-purple-400",
      complete: "text-emerald-400",
      voided: "text-zinc-600",
    }
  },
  defaultVariants: {
    state: "draft"
  }
});

export const StateDot = ({ state }: { state: string }) => (
  <span className={stateColors({ state: state as any, className: "w-2 h-2 rounded-full bg-current" })} />
);
