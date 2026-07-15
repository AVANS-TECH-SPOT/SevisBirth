import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">
              <span className="text-primary">Sevis</span>Birth
            </span>
          </Link>
          {user && (
            <div className="hidden md:flex items-center text-sm font-medium text-muted-foreground ml-4 pl-4 border-l border-border h-6">
              <span className="capitalize">{user.role.replace('_', ' ')}</span>
              <span className="mx-2">•</span>
              <span className="font-mono text-xs">{user.facilityCode}</span>
            </div>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium leading-none">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.facilityName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
