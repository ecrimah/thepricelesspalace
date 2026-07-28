import OrderDetailClient from './OrderDetailClient';

export async function generateStaticParams() {
  return [];
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailClient orderId={id} />;
}
