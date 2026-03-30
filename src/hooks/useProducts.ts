import { useState, useEffect } from 'react';
import { Product } from '../types';
import { productService } from '../services/productService';
import { useAuth } from '../context/AuthContext';

export const useProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = productService.subscribeToProducts(
      user.uid,
      (data) => {
        setProducts(data);
        setLoading(false);
      },
      (err) => {
        setError('Failed to load products. Please check your permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addProduct = async (productData: Omit<Product, 'id' | 'merchantId' | 'createdAt'>) => {
    if (!user) return;
    return await productService.addProduct(user.uid, productData);
  };

  const updateProduct = async (productId: string, productData: Partial<Product>) => {
    if (!user) return;
    return await productService.updateProduct(user.uid, productId, productData);
  };

  const deleteProduct = async (productId: string) => {
    if (!user) return;
    return await productService.deleteProduct(user.uid, productId);
  };

  return { products, loading, error, addProduct, updateProduct, deleteProduct };
};
