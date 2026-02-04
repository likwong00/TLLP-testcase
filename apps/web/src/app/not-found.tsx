import NotFoundCard from "@/components/features/NotFoundCard";

export default function NotFound() {
    return (
        <div className="flex items-center justify-center min-h-[80vh] px-4">
            <NotFoundCard
                title="Page not found"
                description="The page you’re looking for doesn’t exist or has been removed."
                backLabel="Back to home page"
                backHref="/"
            />
        </div>
    );
}
