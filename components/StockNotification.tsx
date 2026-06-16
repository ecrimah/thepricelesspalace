'use client';

interface StockNotificationProps {
  stockCount: number;
  threshold?: number;
  viewCount?: number;
}

export default function StockNotification({ stockCount, threshold = 10, viewCount }: StockNotificationProps) {
  const isLowStock = stockCount <= threshold;
  const isVeryLowStock = stockCount <= 5;

  return (
    <div className="space-y-2">
      {isLowStock && (
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
          isVeryLowStock 
            ? 'bg-[#E89DB5]/50 border border-[#FF6666]/30' 
            : 'bg-[#FFFFCC]/50 border border-[#D8B85F]/30'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            isVeryLowStock ? 'bg-[#FF6666]' : 'bg-[#D8B85F]'
          }`}></div>
          <span className={`text-sm font-semibold ${
            isVeryLowStock ? 'text-[#9A1900]' : 'text-[#996633]'
          }`}>
            {isVeryLowStock ? '🔥 ' : '⚠️ '}
            Only {stockCount} left in stock - Order soon!
          </span>
        </div>
      )}

      {viewCount && viewCount > 50 && (
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#C9A24E]/10 border border-[#C9A24E]/30">
          <div className="w-6 h-6 flex items-center justify-center bg-[#141414] rounded-full">
            <i className="ri-eye-fill text-white text-xs"></i>
          </div>
          <span className="text-sm font-semibold text-[#C9A24E]">
            🔥 {viewCount.toLocaleString()} people viewed this today
          </span>
        </div>
      )}

      {viewCount && viewCount > 200 && (
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gradient-to-r from-[#FF6666] to-[#FF9999] text-white">
          <div className="w-6 h-6 flex items-center justify-center bg-white/20 rounded-full animate-pulse">
            <i className="ri-fire-fill text-sm"></i>
          </div>
          <span className="text-sm font-bold">
            🔥 TRENDING NOW - Hot Item!
          </span>
        </div>
      )}
    </div>
  );
}
