import { useNavigate } from 'react-router-dom';
import { Star, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Shop } from '@/types';
import { cn } from '@/lib/utils';

interface ShopCardProps {
  shop: Shop;
  index?: number;
}

export function ShopCard({ shop, index = 0 }: ShopCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      onClick={() => navigate(`/student/shop/${shop.id}`)}
      className="group cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
        {/* Image */}
        <div className="relative h-36 overflow-hidden">
          <img
            src={shop.image}
            alt={shop.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Category Badge */}
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-card/90 backdrop-blur-sm">
            {shop.category}
          </span>

          {/* Status Badge */}
          <span
            className={cn(
              "absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold",
              shop.isOpen
                ? "bg-success text-success-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {shop.isOpen ? 'Open' : 'Closed'}
          </span>

          {/* Shop Name on Image */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-bold text-white truncate">{shop.name}</h3>
            <p className="text-xs text-white/80 truncate">{shop.description}</p>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-warning">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-semibold">{shop.rating}</span>
              <span className="text-muted-foreground">({shop.reviewCount})</span>
            </div>
            
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{shop.deliveryTime}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{shop.location}</span>
            <span className="ml-auto text-primary font-semibold">
              ${shop.deliveryFee.toFixed(2)} delivery
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
