import SharesDetailClient from "@/components/client/shares/SharesDetailClient";

type SharesPageProps = {
    params: { id: string };
};

export default function SharePage({ params }: SharesPageProps) {
    return <SharesDetailClient shareId={params.id} />;
}
