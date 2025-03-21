export type ContentType = 'text' | 'image';

export interface IContent {
  _id?: string;
  type: ContentType;
  content: string;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTextContentDto {
  content: string;
}

export interface CreateImageContentDto {
  file: Express.Multer.File;
} 