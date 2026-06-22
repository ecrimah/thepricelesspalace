interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
}

interface OrderSummaryProps {
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  discount?: number;
  couponCode?: string | null;
}

export default function OrderSummary({ items, subtotal, shipping, tax, total, discount = 0, couponCode }: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-[#141414]/[0.06] p-6 sticky top-4">
      <h2 className="text-xl font-bold text-[#141414] mb-6">Order Summary</h2>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={`${item.id}-${item.variant || 'novar'}`} className="flex space-x-4">
            <div className="relative w-20 h-20 bg-[#F3F3F3] rounded-xl overflow-hidden flex-shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-[#C9A24E] to-[#9C7A2E] text-white text-xs font-bold rounded-full ring-2 ring-white">
                {item.quantity}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#141414] text-sm line-clamp-2">{item.name}</h3>
              {item.variant && <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>}
              <p className="text-[#141414] font-bold mt-1">₵ {item.price.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#141414]/10 pt-4 space-y-3">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span className="font-semibold">₵ {subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-[#1a7f37]">
            <span>Discount{couponCode ? ` (${couponCode})` : ''}</span>
            <span className="font-semibold">-₵ {discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-700">
          <span>Shipping</span>
          <span className="font-semibold">
            {shipping === 0 ? 'FREE' : `₵ ${shipping.toFixed(2)}`}
          </span>
        </div>

      </div>

      <div className="border-t border-[#141414]/10 mt-4 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-[#141414]">Total</span>
          <span className="text-2xl font-extrabold bg-gradient-to-r from-[#C9A24E] to-[#9C7A2E] bg-clip-text text-transparent">₵ {total.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-6 p-4 bg-[#C9A24E]/10 border border-[#C9A24E]/25 rounded-xl">
        <div className="flex items-center space-x-2 text-[#141414]">
          <i className="ri-shield-check-line text-xl text-[#C9A24E]"></i>
          <p className="text-sm font-semibold">Secure Checkout</p>
        </div>
      </div>
    </div>
  );
}
