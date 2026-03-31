import React from 'react';
import { motion } from 'motion/react';

interface MobileCardListProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  onItemClick?: (item: T) => void;
  className?: string;
}

export function MobileCardList<T>({ items, renderCard, onItemClick, className }: MobileCardListProps<T>) {
  return (
    <div className={`lg:hidden space-y-4 ${className}`}>
      {items.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onItemClick?.(item)}
          className={`bg-white border border-gray-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all ${
            onItemClick ? 'cursor-pointer active:scale-[0.98]' : ''
          }`}
        >
          {renderCard(item, index)}
        </motion.div>
      ))}
    </div>
  );
}
