import { useListBirthRecords } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, MapPin } from "lucide-react";
import { StateDot } from "@/components/status-badge";
import { format } from "date-fns";

export default function ChwQueue() {
  const { data, isLoading } = useListBirthRecords({
    state: "draft,submitted", // Showing pending ones
    limit: 20
  });

  return (
    <div className="flex flex-col h-full bg-background pb-16 overflow-y-auto">
      <div className="px-6 py-6 bg-card border-b border-border sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Pending Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Registrations waiting for facility sync or review.</p>
      </div>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {data?.records.map((record) => (
              <Card key={record.id} className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-foreground text-lg">
                        {record.childFirstName} {record.childLastName}
                      </p>
                      <p className="text-sm font-mono text-muted-foreground">ID: {record.id.slice(0, 8)}</p>
                    </div>
                    <Badge variant="outline" className="bg-background">
                      <StateDot state={record.state} />
                      <span className="ml-1.5 capitalize">{record.stateLabel}</span>
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Submitted: {format(new Date(record.createdAt), 'PP p')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{record.birthPlace}, {record.district}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {data?.records.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                No pending registrations in queue.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
