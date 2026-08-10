import {PropertyImageEntity} from './PropertyImage.entity';

import {Department} from './enums/Department.enum';
import {District} from './enums/District.enum';
import {OperationType} from './enums/OperationType.enum';
import {PropertyType} from './enums/PropertyType.enum';
import {StatusType} from './enums/StatusType.enum';
import {Tag} from './enums/Tag.enum';

export interface PropertyEntityProps {
  id?: number;
  title: string;
  priceDollars: number;
  priceSoles?: number | null;
  secondPriceDollars?: number | null;
  secondPriceSoles?: number | null;
  department: Department;
  district?: District | null;
  address: string;
  longitude : number | null;
  latitude : number | null;
  propertyType: PropertyType;
  operationType: OperationType;
  totalArea: number;
  builtArea: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkings?: number | null;
  description: string;
  antique?: number | null;
  publishedAt?: string | Date | null;
  statusType: StatusType;
  featured: boolean;
  tags?: Tag[];
  images: PropertyImageEntity[];
}

export class PropertyEntity {
  id: number;
  title: string;
  priceDollars: number;
  priceSoles: number | null;
  secondPriceDollars: number | null;
  secondPriceSoles: number | null;
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
  publishedAt: Date | null;
  statusType: StatusType;
  featured: boolean;

  private readonly tagSet = new Set<Tag>();
  private readonly album: PropertyImageEntity[] = [];

  constructor(props: PropertyEntityProps) {
    this.id = props.id ?? 0;
    this.title = props.title;
    this.priceDollars = props.priceDollars;
    this.priceSoles = props.priceSoles ?? null;
    this.secondPriceDollars = props.secondPriceDollars ?? null;
    this.secondPriceSoles = props.secondPriceSoles ?? null;
    this.department = props.department;
    this.district = props.district ?? null;
    this.address = props.address;
    this.longitude = props.longitude ?? null;
    this.latitude = props.latitude ?? null;
    this.propertyType = props.propertyType;
    this.operationType = props.operationType;
    this.totalArea = props.totalArea;
    this.builtArea = props.builtArea;
    this.bedrooms = props.bedrooms ?? null;
    this.bathrooms = props.bathrooms ?? null;
    this.parkings = props.parkings ?? null;
    this.description = props.description;
    this.antique = props.antique ?? null;

    this.publishedAt = props.publishedAt
      ? new Date(props.publishedAt)
      : null;

    this.statusType = props.statusType;
    this.featured = props.featured;

    this.validateCoreRules();
    this.updateTags(props.tags ?? []);
    this.createAlbum(props.images);
  }

  get tags(): Tag[] {
    return [...this.tagSet];
  }

  get images(): ReadonlyArray<PropertyImageEntity> {
    return [...this.album];
  }

  addTag(tag: Tag): void {
    if (!tag) throw new Error('Tag cannot be null');
    if (this.tagSet.has(tag)) throw new Error('Tag already exists');
    this.tagSet.add(tag);
  }

  updateTags(newTags: Tag[]): void {
    this.tagSet.clear();
    newTags.forEach((tag) => this.addTag(tag));
  }

  addImageToAlbum(image: PropertyImageEntity): void {
    const orderTaken = this.album.some(i => i.displayOrder === image.displayOrder);
    if (orderTaken) throw new Error(`Display order ${image.displayOrder} is already taken`);

    if (image.cover) this.unsetCurrentCover();

    this.album.push(image);
    this.validateExactlyOneCover();
  }

  createAlbum(images: PropertyImageEntity[]): void {
    if (!images || images.length === 0) {
      throw new Error('Property must include at least one image');
    }

    const orders = new Set<number>();
    for (const img of images) {
      if (orders.has(img.displayOrder)) {
        throw new Error('Display order must be unique');
      }
      orders.add(img.displayOrder);
    }

    this.album.length = 0;
    images.forEach(img => this.album.push(img));

    this.validateExactlyOneCover();
  }

  private unsetCurrentCover(): void {
    this.album.forEach(img => img.unsetCover());
  }

  private validateExactlyOneCover(): void {
    const count = this.album.filter(i => i.cover).length;
    if (count !== 1) {
      throw new Error('Property must have exactly one cover image');
    }
  }

  private validateCoreRules(): void {
    if (!this.title?.trim()) throw new Error('Title cannot be blank');
    if (this.priceDollars <= 0) throw new Error('Price must be > 0');

    if (this.priceSoles !== null && this.priceSoles <= 0) {
      throw new Error('Price in soles must be > 0');
    }

    if (this.department === Department.LIMA && !this.district) {
      throw new Error('District is required when department is Lima');
    }

    if (this.department !== Department.LIMA && this.district) {
      throw new Error('District only allowed for Lima');
    }

    if (!this.address?.trim()) throw new Error('Address cannot be blank');
    if (!this.description?.trim()) throw new Error('Description cannot be blank');

    if (this.totalArea <= 0) throw new Error('Total area must be > 0');
    if (this.builtArea <= 0) throw new Error('Built area must be > 0');


    if (this.bedrooms !== null && this.bedrooms < 0) throw new Error('Bedrooms cannot be negative');
    if (this.bathrooms !== null && this.bathrooms < 0) throw new Error('Bathrooms cannot be negative');
    if (this.parkings !== null && this.parkings < 0) throw new Error('Parkings cannot be negative');
  }
}
