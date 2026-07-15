import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { StateHistory } from "@workspace/api-client-react";
import { StateDot } from "./status-badge";

export function RecordHistory({ history }: { history: StateHistory[] }) {
  if (!history || history.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No history available.</div>;
  }

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
      {history.map((item, i) => (
        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-background bg-card group-[.is-active]:bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            <StateDot state={item.toState} />
          </div>
          <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] bg-card border border-border p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between space-x-2 mb-1">
              <div className="font-bold text-sm capitalize">{item.toState}</div>
              <time className="font-mono text-xs text-muted-foreground">{format(new Date(item.createdAt), 'PP p')}</time>
            </div>
            <div className="text-xs text-muted-foreground">
              By {item.actorName} ({item.actorRole})
            </div>
            {item.reason && (
              <div className="mt-2 text-xs bg-muted/50 p-2 rounded italic text-muted-foreground">
                "{item.reason}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}