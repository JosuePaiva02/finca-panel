import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

import { Department } from '../domain/model/enums/Department.enum';
import { District } from '../domain/model/enums/District.enum';
import { OperationType } from '../domain/model/enums/OperationType.enum';
import { PropertyType } from '../domain/model/enums/PropertyType.enum';
import { StatusType } from '../domain/model/enums/StatusType.enum';
import { Tag } from '../domain/model/enums/Tag.enum';

/**
 * API resource for a property image in the album.
 */
export interface PropertyImageResource extends BaseResource {
  fileName: string;
  filePath: string;
  displayOrder: number;
  cover?: boolean;
  isCover?: boolean;
}

export interface ImageUploadResource {
  fileName: string;
  filePath: string;
}

export interface CreatePropertyImageRequest {
  id?: number;
  fileName: string;
  filePath: string;
  displayOrder: number;
  cover?: boolean;
  isCover?: boolean;
}

export interface NewPropertyImageRequest {
  fileName: string;
  filePath: string;
  displayOrder: number;
  cover: boolean;
}

export interface UpdatedPropertyImageRequest {
  imageId: number;
  fileName: string;
  filePath: string;
  displayOrder: number;
  cover: boolean;
}

export interface DeletedPropertyImageRequest {
  imageId: number;
}

export interface CreatePropertyRequest {
  title: string;
  priceDollars: number;
  priceSoles: number | null;
  secondPriceDollars?: number | null;
  secondPriceSoles?: number | null;
  department: Department;
  district: District | null;
  address: string;
  longitude?: number | null;
  latitude?: number | null;
  propertyType: PropertyType;
  operationType: OperationType;
  totalArea: number;
  builtArea: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parkings: number | null;
  description: string;
  antique: number | null;
  statusType: StatusType;
  featured: boolean;
  tags: Tag[];
  images: CreatePropertyImageRequest[];
}

/**
 * API request payload for updating a property.
 */
export interface UpdatePropertyRequest {
  title: string;
  priceDollars: number;
  priceSoles: number | null;
  secondPriceDollars?: number | null;
  secondPriceSoles?: number | null;
  department: Department;
  district: District | null;
  address: string;
  longitude?: number | null;
  latitude?: number | null;
  propertyType: PropertyType;
  operationType: OperationType;
  totalArea: number;
  builtArea: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parkings: number | null;
  description: string;
  antique: number | null;
  statusType: StatusType;
  featured: boolean;
  tags: Tag[];
  newImages: NewPropertyImageRequest[];
  updatedImages: UpdatedPropertyImageRequest[];
  deletedImages: DeletedPropertyImageRequest[];
}

/**
 * API resource/DTO for a property.
 */
export interface PropertyResource extends BaseResource {
  title: string;
  priceDollars: number;
  priceSoles: number | null;
  secondPriceDollars?: number | null;
  secondPriceSoles?: number | null;
  department: Department;
  district: District | null;
  address: string;
  longitude : number | null;
  latitude : number | null;
  propertyType: PropertyType;
  operationType: OperationType;
  totalArea: number;
  builtArea: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parkings: number | null;
  description: string;
  antique: number | null;
  publishedAt: string | null;
  statusType: StatusType;
  featured: boolean;
  tags: Tag[];
  images: PropertyImageResource[];
}

/**
 * Paged response shape for GET /api/v1/properties.
 */
export interface PropertiesResponse extends BaseResponse {
  content: PropertyResource[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  sort: string;
}

export interface PropertySearchParams {
  minPriceDollars?: number;
  maxPriceDollars?: number;
  minPriceSoles?: number;
  maxPriceSoles?: number;
  department?: Department;
  district?: District;
  propertyType?: PropertyType;
  operationType?: OperationType;
  statusType?: StatusType;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minParkings?: number;
  maxParkings?: number;
  minTotalArea?: number;
  maxTotalArea?: number;
  minBuiltArea?: number;
  maxBuiltArea?: number;
  tags?: Tag[];
  sorting?: string;
  page?: number;
  size?: number;
  sort?: string;
}
