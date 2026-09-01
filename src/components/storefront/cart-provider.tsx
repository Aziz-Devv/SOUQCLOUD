'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StorefrontCart } from '@/lib/services/cart-service';
import {
  getCartAction,
  addToCartAction,
  updateCartLineAction,
  removeCartLineAction,
} from '@/app/actions/cart';

interface CartContextType {
  cart: StorefrontCart | null;
  isOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  storeId,
  initialCart,
  children,
}: {
  storeId: string;
  initialCart?: StorefrontCart | null;
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<StorefrontCart | null>(initialCart || null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const res = await getCartAction({ storeId });
      if (res.success) {
        setCart(res.data);
      }
    } catch {
      // Ignore background refresh errors
    }
  }, [storeId]);

  useEffect(() => {
    if (!initialCart) {
      void refreshCart();
    }
  }, [initialCart, refreshCart]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const addToCart = async (variantId: string, quantity: number = 1) => {
    setIsLoading(true);
    try {
      const res = await addToCartAction({
        storeId,
        variantId,
        quantity,
        cartId: cart?.id,
      });

      if (res.success) {
        setCart(res.data);
        setIsOpen(true);
      } else {
        alert(res.error.message || 'فشل إضافة المنتج إلى السلة');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (lineId: string, quantity: number) => {
    if (!cart) return;
    setIsLoading(true);
    try {
      const res = await updateCartLineAction({
        storeId,
        cartId: cart.id,
        lineId,
        quantity,
      });

      if (res.success) {
        setCart(res.data);
      } else {
        alert(res.error.message || 'فشل تحديث الكمية');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeLine = async (lineId: string) => {
    if (!cart) return;
    setIsLoading(true);
    try {
      const res = await removeCartLineAction({
        storeId,
        cartId: cart.id,
        lineId,
      });

      if (res.success) {
        setCart(res.data);
      } else {
        alert(res.error.message || 'فشل حذف المنتج');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        isLoading,
        openCart,
        closeCart,
        addToCart,
        updateQuantity,
        removeLine,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
