"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function CancelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("booking_id");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <XCircle size={40} className="text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Your session has been reserved but payment was not completed. You can
        try again or choose a different trainer.
      </p>
      {bookingId && (
        <Button
          className="w-full max-w-xs mb-3"
          onClick={() => router.back()}
        >
          Try Again
        </Button>
      )}
      <Button
        variant="outline"
        className="w-full max-w-xs"
        onClick={() => router.push("/trainers")}
      >
        Browse Trainers
      </Button>
    </div>
  );
}

export default function BookingCancelPage() {
  return (
    <Suspense>
      <CancelContent />
    </Suspense>
  );
}
