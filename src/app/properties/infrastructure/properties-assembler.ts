import { PropertyImageEntity } from '../domain/model/PropertyImage.entity';
import { PropertyEntity, PropertyEntityProps } from '../domain/model/Property.entity';
import { Department } from '../domain/model/enums/Department.enum';
import { District } from '../domain/model/enums/District.enum';
import { OperationType } from '../domain/model/enums/OperationType.enum';
import { PropertyType } from '../domain/model/enums/PropertyType.enum';
import { StatusType } from '../domain/model/enums/StatusType.enum';
import { Tag } from '../domain/model/enums/Tag.enum';
import {
  PropertyResource,
  PropertiesResponse,
  PropertyImageResource
} from './properties-response';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { DepartmentLabel } from '../domain/model/enums/Department-label';
import { DistrictLabel } from '../domain/model/enums/District-label';
import { OperationTypeLabel } from '../domain/model/enums/OperationType-label';
import { PropertyTypeLabel } from '../domain/model/enums/PropertyType-label';
import { StatusTypeLabel } from '../domain/model/enums/StatusType-label';

export class PropertiesAssembler
  implements BaseAssembler<PropertyEntity, PropertyResource, PropertiesResponse>
{
  /**
   * Converts a paged properties response to Property entities.
   */
  toEntitiesFromResponse(response: PropertiesResponse): PropertyEntity[] {
    return (response.content ?? []).map((propertyResource) =>
      this.toEntityFromResource(propertyResource)
    );
  }

  /**
   * Converts a PropertyResource to a Property entity.
   */
  toEntityFromResource(resource: PropertyResource): PropertyEntity {
    const normalizedDepartment = this.normalizeDepartment(resource.department);
    const normalizedDistrict = this.normalizeDistrict(resource.district);
    const album = this.normalizeImages(resource.images ?? []);

    const props: PropertyEntityProps = {
      id: resource.id,
      title: resource.title,
      priceDollars: resource.priceDollars,
      priceSoles: resource.priceSoles,
      secondPriceDollars: resource.secondPriceDollars ?? null,
      secondPriceSoles: resource.secondPriceSoles ?? null,
      department: normalizedDepartment,
      district: normalizedDepartment === Department.LIMA ? normalizedDistrict : null,
      address: resource.address,
      longitude : resource.longitude,
      latitude : resource.latitude,
      propertyType: this.normalizePropertyType(resource.propertyType),
      operationType: this.normalizeOperationType(resource.operationType),
      totalArea: resource.totalArea,
      builtArea: resource.builtArea,
      bedrooms: resource.bedrooms,
      bathrooms: resource.bathrooms,
      parkings: resource.parkings,
      description: resource.description,
      publishedAt: resource.publishedAt,
      statusType: this.normalizeStatusType(resource.statusType),
      featured: resource.featured,
      antique: resource.antique,
      tags: this.normalizeTags(resource.tags ?? []),
      images: album
    };

    return new PropertyEntity(props);
  }

  /**
   * Converts a Property entity to a PropertyResource.
   */
  toResourceFromEntity(entity: PropertyEntity): PropertyResource {
    return {
      id: entity.id,
      title: entity.title,
      priceDollars: entity.priceDollars,
      priceSoles: entity.priceSoles,
      department: entity.department,
      district: entity.district,
      address: entity.address,
      longitude : entity.longitude,
      latitude : entity.latitude,
      propertyType: entity.propertyType,
      operationType: entity.operationType,
      totalArea: entity.totalArea,
      builtArea: entity.builtArea,
      bedrooms: entity.bedrooms,
      bathrooms: entity.bathrooms,
      parkings: entity.parkings,
      description: entity.description,
      publishedAt: entity.publishedAt ? entity.publishedAt.toISOString() : null,
      statusType: entity.statusType,
      featured: entity.featured,
      antique: entity.antique,
      tags: entity.tags,
      images: entity.images.map((image) => ({
        id: image.id,
        fileName: image.fileName,
        filePath: image.filePath,
        displayOrder: image.displayOrder,
        cover: image.cover
      }))
    };
  }

  private toImageEntityFromResource(resource: PropertyImageResource): PropertyImageEntity {
    const cover = resource.cover ?? resource.isCover ?? false;

    return new PropertyImageEntity({
      id: resource.id,
      fileName: resource.fileName,
      filePath: resource.filePath,
      displayOrder: resource.displayOrder,
      cover
    });
  }

  private normalizeDepartment(value: string): Department {
    return this.mapEnumValue(Department, value, DepartmentLabel, Department.LIMA);
  }

  private normalizeDistrict(value: string | null): District | null {
    if (!value) {
      return null;
    }

    const aliases: Record<string, District> = {
      ANCN: District.ANCON,
      CERCADO_DE_LIMA: District.CERCADO
    };

    return this.mapEnumValueOrNull(District, value, DistrictLabel, aliases);
  }

  private normalizeOperationType(value: string): OperationType {
    return this.mapEnumValue(OperationType, value, OperationTypeLabel, OperationType.SALE);
  }

  private normalizePropertyType(value: string): PropertyType {
    const aliases: Record<string, PropertyType> = {
      APARTAMENTO: PropertyType.APARTMENT,
      DEPARTAMENTO: PropertyType.APARTMENT,
      MINI_DEPARTAMENTO: PropertyType.MINI_APARTMENT
    };

    return this.mapEnumValue(PropertyType, value, PropertyTypeLabel, PropertyType.APARTMENT, aliases);
  }

  private normalizeStatusType(value: string): StatusType {
    const aliases: Record<string, StatusType> = {
      A: StatusType.NEW,
      B: StatusType.SEMI_NEW,
      C: StatusType.TO_REFORM
    };

    return this.mapEnumValue(StatusType, value, StatusTypeLabel, StatusType.NEW, aliases);
  }

  private normalizeTags(values: string[]): Tag[] {
    return values
      .map((value) => this.mapEnumValueOrNull(Tag, value))
      .filter((value): value is Tag => value !== null);
  }

  private normalizeImages(images: PropertyImageResource[]): PropertyImageEntity[] {
    const validImages = images
      .filter((image) => !!image?.fileName && !!image?.filePath && (image.displayOrder ?? 0) > 0)
      .map((image) => this.toImageEntityFromResource(image));

    if (validImages.length === 0) {
      return [
        new PropertyImageEntity({
          id: 0,
          fileName: 'placeholder',
          filePath: 'https://via.placeholder.com/640x360?text=Sin+imagen',
          displayOrder: 1,
          cover: true
        })
      ];
    }

    if (!validImages.some((image) => image.cover)) {
      validImages[0].cover = true;
    }

    return validImages;
  }

  private mapEnumValue<T extends string>(
    enumType: Record<string, T>,
    rawValue: string,
    labels: Partial<Record<T, string>>,
    fallback: T,
    aliases: Record<string, T> = {}
  ): T {
    return this.mapEnumValueOrNull(enumType, rawValue, labels, aliases) ?? fallback;
  }

  private mapEnumValueOrNull<T extends string>(
    enumType: Record<string, T>,
    rawValue: string,
    labels: Partial<Record<T, string>> = {},
    aliases: Record<string, T> = {}
  ): T | null {
    const value = (rawValue ?? '').toString();
    if (!value.trim()) {
      return null;
    }

    const enumValues = Object.values(enumType);
    if (enumValues.includes(value as T)) {
      return value as T;
    }

    const normalized = this.normalizeText(value);

    const byAlias = aliases[normalized];
    if (byAlias) {
      return byAlias;
    }

    const byEnumValue = enumValues.find((enumValue) => this.normalizeText(enumValue) === normalized);
    if (byEnumValue) {
      return byEnumValue;
    }

    const byLabel = enumValues.find((enumValue) => this.normalizeText(labels[enumValue] ?? '') === normalized);
    if (byLabel) {
      return byLabel;
    }

    return null;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }
}
