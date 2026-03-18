import { AlertOctagonIcon } from "lucide-react";

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-16 skeleton" />
        <div className="h-4 w-3/4 skeleton" />
        <div className="h-4 w-1/2 skeleton" />
        <div className="h-8 skeleton mt-2" />
      </div>
    </div>
  );
}

export function Loader({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-stone-400">
      <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

export function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="text-4xl">
        <AlertOctagonIcon size={18} />
      </div>
      <p className="text-stone-600 font-medium text-center max-w-sm">
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-2">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      {icon && <div className="text-5xl mb-2">{icon}</div>}
      <h3 className="text-lg font-bold text-stone-800">{title}</h3>
      {description && (
        <p className="text-sm text-stone-500 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
