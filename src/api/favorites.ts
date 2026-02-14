/**
 * 收藏功能 API
 */
import client from './client';

export interface Favorite {
  id: number;
  name: string;
  strategy_name: string;
  symbol: string;
  period: string;
  total_profit: number;
  win_rate: number;
  created_at: string;
}

export interface FavoriteDetail extends Favorite {
  start_date: string;
  end_date: string;
  params: Record<string, unknown>;
  trades: Array<{
    time: string;
    signal: string;
    price: number;
    reason: string;
  }>;
  stats: Record<string, unknown>;
}

export interface CreateFavoriteData {
  name?: string;
  strategy_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  params?: Record<string, unknown>;
  trades?: Array<{
    time: string;
    signal: string;
    price: number;
    reason: string;
  }>;
  stats?: Record<string, unknown>;
}

export const favoritesApi = {
  /**
   * 获取收藏列表
   */
  list: async (limit = 50) => {
    const response = await client.get<{ data: Favorite[] }>('/api/favorites', {
      params: { limit },
    });
    return response.data;
  },
  
  /**
   * 获取收藏详情
   */
  get: async (id: number) => {
    const response = await client.get<{ data: FavoriteDetail }>(`/api/favorites/${id}`);
    return response.data;
  },
  
  /**
   * 创建收藏
   */
  create: async (data: CreateFavoriteData) => {
    const response = await client.post<{ data: { id: number; name: string } }>('/api/favorites', data);
    return response.data;
  },
  
  /**
   * 删除收藏
   */
  delete: async (id: number) => {
    const response = await client.delete<{ success: boolean }>(`/api/favorites/${id}`);
    return response.data;
  },
};
