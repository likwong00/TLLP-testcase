import RequestsDetailClient from "@/components/client/requests/RequestsDetailClient";

type RequestsPageProps = {
    params: { id: string };
};

export default function RequestsPage({ params }: RequestsPageProps) {
    return <RequestsDetailClient requestId={params.id} />;
}
