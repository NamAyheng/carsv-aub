export interface PublicBlogPost {
  id: number;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  date: string;
  author: string;
  image: string;
  featured: boolean;
  body: string[];
  tips: string[];
}

export async function loadPublicBlog(): Promise<PublicBlogPost[]> {
  const response = await fetch('/api/public/blog/');
  if (!response.ok) throw new Error('The blog could not be loaded.');
  const data = await response.json();
  return Array.isArray(data) ? (data as PublicBlogPost[]) : [];
}
