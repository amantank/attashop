import apiClient from "./client";

export interface Banner {
  _id: string;
  bannerId: string;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  imageUrl: string;
  ctaText: string;
  ctaTextHi: string;
  ctaLink: string;
  bgColor: string;
  isActive: boolean;
  priority: number;
  startDate: string;
  endDate: string;
}

export async function getActiveBanners(): Promise<{ banners: Banner[] }> {
  const { data } = await apiClient.get("/api/banners/active");
  return data;
}
