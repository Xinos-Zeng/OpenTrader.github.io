import api from './client';
import { ApiResponse } from '../types';

// 排行榜项目
export interface LeaderboardItem {
  rank: number;
  username: string;
  avatar: string | null;
  return_rate: number;
  strategy_name: string | null;
  is_mock: boolean;
}

// 用户最佳排名
export interface MyBest {
  rank: number;
  return_rate: number;
  strategy_name: string;
}

// 排行榜响应
export interface LeaderboardData {
  leaderboard: LeaderboardItem[];
  my_best: MyBest | null;
}

export const leaderboardApi = {
  /**
   * 获取收益率排行榜
   * @param limit 返回数量，默认 10
   */
  getLeaderboard: async (limit: number = 10) => {
    const response = await api.get<ApiResponse<LeaderboardData>>('/api/leaderboard', {
      params: { limit }
    });
    return response.data;
  }
};

export default leaderboardApi;
