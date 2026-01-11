import { Skeleton } from "@/components/ui/skeleton";
import { getItemPadding } from "./constants";

interface LoadingRowProps {
    level: number;
}

export const LoadingRow = ({ level }: LoadingRowProps) => {
    return (
        <div
            className="flex items-center gap-2 py-1"
            style={{ paddingLeft: getItemPadding(level, false) }}
        >
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
        </div>
    );
};
