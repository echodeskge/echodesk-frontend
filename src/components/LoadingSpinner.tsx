import { Spinner } from "./ui/spinner";

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5">
      <Spinner className="size-10" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
