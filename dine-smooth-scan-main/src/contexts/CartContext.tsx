import React, { createContext, useState, useEffect, useMemo, ReactNode } from "react";
import { MenuItem, CartItem } from "../types";

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (uid: string) => void;
  updateQuantity: (uid: string, delta: number) => void;
  clearCart: () => void;
  totals: {
    subtotal: number;
    service: number;
    tax: number;
    total: number;
  };
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from session storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCart = sessionStorage.getItem("customerCart");
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    }
  }, []);

  // Sync cart to session storage
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("customerCart", JSON.stringify(newCart));
    }
  };

  const addToCart = (newItem: CartItem) => {
    const areOptionIdsEqual = (a?: number[], b?: number[]) => {
      const lenA = a ? a.length : 0;
      const lenB = b ? b.length : 0;
      if (lenA !== lenB) return false;
      if (lenA === 0) return true;
      const sortedA = [...a!].sort((x, y) => x - y);
      const sortedB = [...b!].sort((x, y) => x - y);
      return sortedA.every((val, index) => val === sortedB[index]);
    };

    const existingIndex = cart.findIndex(
      (c) =>
        c.item.id === newItem.item.id &&
        c.size === newItem.size &&
        c.cook === newItem.cook &&
        (c.notes || "").trim() === (newItem.notes || "").trim() &&
        areOptionIdsEqual(c.optionIds, newItem.optionIds)
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: updatedCart[existingIndex].quantity + newItem.quantity,
      };
      saveCart(updatedCart);
    } else {
      saveCart([...cart, newItem]);
    }
  };

  const removeFromCart = (uid: string) => {
    saveCart(cart.filter((c) => c.uid !== uid));
  };

  const updateQuantity = (uid: string, delta: number) => {
    const updated = cart.flatMap((c) => {
      if (c.uid !== uid) return [c];
      const q = c.quantity + delta;
      return q <= 0 ? [] : [{ ...c, quantity: q }];
    });
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
    const service = subtotal * 0.05;
    const tax = subtotal * 0.08;
    return {
      subtotal,
      service,
      tax,
      total: subtotal + service + tax,
    };
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totals,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
