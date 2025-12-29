export type TemplateType = "ecommerce" | "service";

export interface TemplateAccount {
  id: number;
  name: string;
  description: string;
  template_type: TemplateType;
  github_url: string;
  preview_url: string;
  active: boolean;
  thumbnail_image: string | null;
  alt_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseTemplatePayload {
  template_id?: number;
}
