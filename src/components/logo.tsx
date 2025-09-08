import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        <path d="M1.5 21.5V8.08579C1.5 7.49421 1.94772 7 2.5 7H6M1.5 21.5H22.5M1.5 21.5L8.5 14.5M22.5 21.5V8.08579C22.5 7.49421 22.0523 7 21.5 7H18M22.5 21.5L15.5 14.5M12 21.5V3.5M12 3.5L16.5 7.5M12 3.5L7.5 7.5M18 7H6M18 7C18 4.79086 15.3137 3 12 3C8.68629 3 6 4.79086 6 7M18 7V2.5M6 7V2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span className="text-xl font-bold">Yaksen Hub</span>
    </div>
  );
}
