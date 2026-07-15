import { useGetStats, useListBirthRecords } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Activity, Clock, CheckCircle2, FileText, LayoutDashboard, Settings, UserPlus, LogOut } from "lucide-react";
import { StateDot } from "@/components/status-badge";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

function ChwNav() {
  const [location] = useLocation();
  const { logout } = useAuth();
  
  return (
    <div className="absolute bottom-0 inset-x-0 h-16 bg-card border-t border-border flex items-center justify-around px-4 z-40">
      <Link href="/chw" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location === "/chw" ? "text-primary" : "text-muted-foreground"}`}>
        <LayoutDashboard className="h-5 w-5" />
        <span className="text-[10px] font-medium">Home</span>
      </Link>
      <Link href="/chw/register" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location.startsWith("/chw/register") ? "text-primary" : "text-muted-foreground"}`}>
        <UserPlus className="h-5 w-5" />
        <span className="text-[10px] font-medium">Register</span>
      </Link>
      <Link href="/chw/queue" className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location === "/chw/queue" ? "text-primary" : "text-muted-foreground"}`}>
        <Clock className="h-5 w-5" />
        <span className="text-[10px] font-medium">Queue</span>
      </Link>
      <button onClick={logout} className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground">
        <LogOut className="h-5 w-5" />
        <span className="text-[10px] font-medium">Exit</span>
      </button>
    </div>
  );
}

export default function ChwHome() {
  const { user } = useAuth();
  const { data: stats } = useGetStats();
  const { data: recentRecords } = useListBirthRecords({ limit: 5 });

  return (
    <div className="flex flex-col h-full bg-background pb-16 overflow-y-auto">
      {/* Header Profile Area */}
      <div className="px-6 pt-10 pb-6 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.facilityName}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center text-muted-foreground">
                <FileText className="h-4 w-4 mr-2" />
                <span className="text-xs font-medium">TODAY</span>
              </div>
              <span className="text-3xl font-mono font-bold text-foreground">{stats?.today || 0}</span>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center text-amber-500">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-xs font-medium">PENDING</span>
              </div>
              <span className="text-3xl font-mono font-bold text-foreground">{stats?.pending || 0}</span>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        <Link href="/chw/register">
          <div className="w-full bg-primary text-primary-foreground rounded-xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform shadow-lg shadow-primary/20">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/10 p-2 rounded-lg">
                <UserPlus className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight">New Registration</span>
                <span className="text-xs opacity-80">Start birth record flow</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <span className="text-lg">→</span>
            </div>
          </div>
        </Link>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Registrations</h3>
          <div className="space-y-3">
            {recentRecords?.records.map((record) => (
              <Card key={record.id} className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {record.childFirstName} {record.childLastName}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">ID: {record.id.slice(0, 8)}</p>
                    </div>
                    <Badge variant="outline" className="bg-background">
                      <StateDot state={record.state} />
                      <span className="ml-1.5 capitalize text-[10px]">{record.stateLabel}</span>
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(record.createdAt), 'MMM d, h:mm a')}
                    </span>
                    <span>{record.registrationType}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {!recentRecords?.records.length && (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                No recent records found.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ChwNav />
    </div>
  );
}
