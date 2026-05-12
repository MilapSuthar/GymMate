"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <CheckCircle2 size={40} className="text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Your session has been booked and payment processed. Your trainer will be
        in touch to confirm the details.
      </p>
      <Link href="/trainers">
        <Button className="w-full max-w-xs mb-3">Browse More Trainers</Button>
      </Link>
      <Link href="/">
        <Button variant="outline" className="w-full max-w-xs">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
