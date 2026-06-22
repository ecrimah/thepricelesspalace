'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type CartItem = {
    id: string;
    name: string;
    price: number;
    image: string;
    quantity: number;
    variant?: string;
    slug: string;
    maxStock: number;
    moq?: number; // Minimum Order Quantity
};

export type AppliedCoupon = {
    id?: string;
    code: string;
    type: 'percentage' | 'fixed_amount' | 'free_shipping';
    value: number;
    minimum_purchase?: number;
    maximum_discount?: number | null;
    description?: string;
};

/**
 * Compute the discount amount for a coupon against a given subtotal.
 * Mirrors the server-side validation so cart, checkout and DB stay consistent.
 */
export function calculateCouponDiscount(coupon: AppliedCoupon | null, subtotal: number): number {
    if (!coupon) return 0;
    if (coupon.minimum_purchase && subtotal < coupon.minimum_purchase) return 0;

    let discount = 0;
    if (coupon.type === 'percentage') {
        discount = subtotal * (Number(coupon.value) / 100);
    } else if (coupon.type === 'fixed_amount') {
        discount = Number(coupon.value);
    } else {
        // free_shipping is applied to the shipping line, not the subtotal
        discount = 0;
    }

    if (coupon.maximum_discount && discount > coupon.maximum_discount) {
        discount = Number(coupon.maximum_discount);
    }
    if (discount > subtotal) discount = subtotal;
    return Math.round(discount * 100) / 100;
}

type CartContextType = {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: string, variant?: string) => void;
    updateQuantity: (itemId: string, quantity: number, variant?: string) => void;
    clearCart: () => void;
    cartCount: number;
    subtotal: number;
    isCartOpen: boolean;
    setIsCartOpen: (isOpen: boolean) => void;
    appliedCoupon: AppliedCoupon | null;
    applyCoupon: (coupon: AppliedCoupon) => void;
    removeCoupon: () => void;
    discount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

    // Direct cart toggle
    const handleSetCartOpen = (isOpen: boolean) => {
        setIsCartOpen(isOpen);
    };

    // Load cart from localStorage on mount, with migration for legacy items
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            try {
                const parsed: CartItem[] = JSON.parse(savedCart);
                // Migrate legacy cart items: if `id` is not a UUID, it's likely a slug
                const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const migratedCart = parsed.filter(item => {
                    if (!item.id || !item.name || !item.price) return false; // Remove corrupted items
                    if (!isValidUUID(item.id)) {
                        // Legacy item with slug as id - ensure slug is set, then clear
                        // These items will be resolved at checkout via the slug fallback
                        // But best to remove them so users re-add with correct UUIDs
                        console.warn(`Removing legacy cart item with non-UUID id: ${item.id}`);
                        return false;
                    }
                    // Ensure slug field exists
                    if (!item.slug) {
                        item.slug = item.id;
                    }
                    return true;
                });
                setCart(migratedCart);
                // If items were removed, update localStorage immediately
                if (migratedCart.length !== parsed.length) {
                    localStorage.setItem('cart', JSON.stringify(migratedCart));
                }
            } catch (e) {
                console.error('Failed to parse cart:', e);
                localStorage.removeItem('cart');
            }
        }
        // Restore any applied coupon
        const savedCoupon = localStorage.getItem('appliedCoupon');
        if (savedCoupon) {
            try {
                setAppliedCoupon(JSON.parse(savedCoupon));
            } catch {
                localStorage.removeItem('appliedCoupon');
            }
        }

        setIsInitialized(true);
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('cart', JSON.stringify(cart));
            window.dispatchEvent(new Event('cartUpdated')); // Keep compatibility with legacy listeners if any
        }
    }, [cart, isInitialized]);

    // Persist applied coupon
    useEffect(() => {
        if (!isInitialized) return;
        if (appliedCoupon) {
            localStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon));
        } else {
            localStorage.removeItem('appliedCoupon');
        }
    }, [appliedCoupon, isInitialized]);

    const addToCart = (newItem: CartItem) => {
        setCart((prevCart) => {
            const existingItemIndex = prevCart.findIndex(
                (item) => item.id === newItem.id && item.variant === newItem.variant
            );

            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                const existingItem = newCart[existingItemIndex];
                // Ensure we don't exceed max stock
                const newQuantity = Math.min(
                    existingItem.quantity + newItem.quantity,
                    existingItem.maxStock
                );
                newCart[existingItemIndex] = { ...existingItem, quantity: newQuantity };
                return newCart;
            } else {
                return [...prevCart, newItem];
            }
        });

        setIsCartOpen(true); // Open cart when item is added
    };

    const removeFromCart = (itemId: string, variant?: string) => {
        setCart((prevCart) =>
            prevCart.filter((item) => !(item.id === itemId && item.variant === variant))
        );
    };

    const updateQuantity = (itemId: string, quantity: number, variant?: string) => {
        setCart((prevCart) => {
            const item = prevCart.find(i => i.id === itemId && i.variant === variant);
            if (!item) return prevCart;

            const minQty = item.moq || 1;
            
            // If trying to reduce below MOQ, remove the item
            if (quantity < minQty) {
                return prevCart.filter(i => !(i.id === itemId && i.variant === variant));
            }

            // Clamp quantity between MOQ and maxStock
            const clampedQty = Math.min(Math.max(quantity, minQty), item.maxStock);

            return prevCart.map((i) =>
                i.id === itemId && i.variant === variant
                    ? { ...i, quantity: clampedQty }
                    : i
            );
        });
    };

    const clearCart = () => {
        setCart([]);
        setAppliedCoupon(null);
    };

    const applyCoupon = (coupon: AppliedCoupon) => {
        setAppliedCoupon(coupon);
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = calculateCouponDiscount(appliedCoupon, subtotal);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartCount,
            subtotal,
            isCartOpen,
            setIsCartOpen: handleSetCartOpen,
            appliedCoupon,
            applyCoupon,
            removeCoupon,
            discount
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
