import clsx from "clsx";
import { SessionStatus, SessionStatusLabel } from "@/lib/enums";

const STEPS: SessionStatus[] = [
  SessionStatus.DRAFT,
  SessionStatus.CONVENED,
  SessionStatus.IN_PROGRESS,
  SessionStatus.CLOSED,
  SessionStatus.APPROVED,
];

export default function SessionTimeline({ status }: { status: string }) {
  const currentIndex = STEPS.indexOf(status as SessionStatus);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs",
                  done
                    ? "border-gold bg-gold text-slate-950"
                    : "border-slate-700 bg-slate-900 text-slate-500",
                  isCurrent && "ring-2 ring-gold/40",
                )}
              >
                {i + 1}
              </div>
              <span
                className={clsx(
                  "mt-1 whitespace-nowrap text-[10px]",
                  done ? "text-slate-200" : "text-slate-500",
                )}
              >
                {SessionStatusLabel[step]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={clsx(
                  "mx-1 h-0.5 flex-1",
                  i < currentIndex ? "bg-gold" : "bg-slate-700",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
