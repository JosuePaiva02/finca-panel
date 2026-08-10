import { AfterViewChecked, Component, ElementRef, Inject, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PropertiesService } from '../../../application/properties.service';
import {
  CreatePropertyRequest,
  ImageUploadResource,
  UpdatePropertyRequest
} from '../../../infrastructure/properties-response';
import { PropertyEntity } from '../../../domain/model/Property.entity';
import { Department } from '../../../domain/model/enums/Department.enum';
import { District } from '../../../domain/model/enums/District.enum';
import { PropertyType } from '../../../domain/model/enums/PropertyType.enum';
import { OperationType } from '../../../domain/model/enums/OperationType.enum';
import { StatusType } from '../../../domain/model/enums/StatusType.enum';
import { DepartmentLabel } from '../../../domain/model/enums/Department-label';
import { DistrictLabel } from '../../../domain/model/enums/District-label';
import { PropertyTypeLabel } from '../../../domain/model/enums/PropertyType-label';
import { OperationTypeLabel } from '../../../domain/model/enums/OperationType-label';
import { StatusTypeLabel } from '../../../domain/model/enums/StatusType-label';
import { Tag } from '../../../domain/model/enums/Tag.enum';
import { TagCategory } from '../../../domain/model/enums/TagCategory.enum';
import { TagMetadata } from '../../../domain/model/enums/TagMetadata';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

export type NewPropertyDialogMode = 'create' | 'edit';

export interface NewPropertyDialogData {
  mode: NewPropertyDialogMode;
  property?: PropertyEntity;
}

export interface NewPropertyDialogResult {
  created?: boolean;
  updated?: boolean;
}

interface SelectedImageDraft {
  id?: number;
  file?: File;
  fileName: string;
  filePath: string;
  previewUrl: string;
  isCover: boolean;
  isObjectUrl: boolean;
}

@Component({
  selector: 'app-new-property-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, ReactiveFormsModule],
  templateUrl: './new-property-dialog.component.html',
  styleUrl: './new-property-dialog.component.css'
})
export class NewPropertyDialogComponent implements AfterViewChecked, OnDestroy {
  currentStep = 1;
  readonly maxStep = 4;
  readonly maxAlbumImages = 25;
  readonly dialogMode: NewPropertyDialogMode;
  readonly editingProperty?: PropertyEntity;
  isFeatured = false;
  step1ValidationAttempted = false;
  private isClosing = false;
  private readonly formBuilder = inject(FormBuilder);
  readonly departments = Object.values(Department);
  readonly districts = Object.values(District);
  readonly propertyTypes = Object.values(PropertyType);
  readonly operationTypes = Object.values(OperationType);
  readonly statusTypes = Object.values(StatusType);
  readonly departmentLabels = DepartmentLabel;
  readonly districtLabels = DistrictLabel;
  readonly propertyTypeLabels = PropertyTypeLabel;
  readonly operationTypeLabels = OperationTypeLabel;
  readonly statusTypeLabels = StatusTypeLabel;
  readonly tagGroups = this.buildTagGroups();
  readonly selectedTags = new Set<Tag>();
  isSubmitting = false;
  errorMessage = '';
  selectedImages: SelectedImageDraft[] = [];
  private readonly deletedImageIds = new Set<number>();

  @ViewChild('descriptionEditor') private descriptionEditorRef?: ElementRef<HTMLDivElement>;

  get hasAlbumReady(): boolean {
    return this.selectedImages.length > 0 && this.selectedImages.some((image) => image.isCover);
  }

   readonly form = this.formBuilder.group({
     title: ['', [Validators.required, Validators.maxLength(100)]],
     priceDollars: ['', [Validators.required, Validators.min(0.01)]],
     priceSoles: ['', [Validators.min(0.01)]],
     secondPriceDollars: ['', [Validators.min(0.01)]],
     secondPriceSoles: ['', [Validators.min(0.01)]],
     address: ['', [Validators.required, Validators.maxLength(200)]],
     department: ['' as Department | '', [Validators.required]],
     district: ['' as District | '', []],
     propertyType: ['' as PropertyType | '', [Validators.required]],
     operationType: ['' as OperationType | '', [Validators.required]],
     totalArea: ['', [Validators.required, Validators.min(0.01)]],
     builtArea: ['', [Validators.required, Validators.min(0.01)]],
     bedrooms: ['', [Validators.min(0)]],
     bathrooms: ['', [Validators.min(0)]],
     parkings: ['', [Validators.min(0)]],
     statusType: ['' as StatusType | '', [Validators.required]],
     antique: ['', [Validators.min(0)]],
     description: ['', [Validators.required]]
   });

  constructor(
    private readonly dialogRef: MatDialogRef<NewPropertyDialogComponent, NewPropertyDialogResult>,
    private readonly propertiesService: PropertiesService,
    @Inject(MAT_DIALOG_DATA) data: NewPropertyDialogData | null
  ) {
    this.dialogMode = data?.mode ?? 'create';
    this.editingProperty = data?.property;

    this.form.controls.department.valueChanges.subscribe((departmentValue) => {
      if (departmentValue && departmentValue !== Department.LIMA) {
        this.form.controls.district.setValue('' as District | '');
      }
    });

    if (this.editingProperty) {
      this.patchFormFromProperty(this.editingProperty);
    }
  }

  ngAfterViewChecked(): void {
    if (this.currentStep !== 3) {
      return;
    }

    const editor = this.descriptionEditorRef?.nativeElement;
    if (!editor || document.activeElement === editor) {
      return;
    }

    const formValue = this.form.controls.description.value ?? '';
    console.log('[DEBUG] sync check — editor vacio:', !editor.innerHTML, 'formValue:', formValue);

    if (editor.innerHTML !== formValue) {
      editor.innerHTML = formValue;
    }
  }

  goToNextStep(): void {
     // Si estamos en el step 3, sincronizar el contenido del editor al formulario
     if (this.currentStep === 3) {
       const editor = this.descriptionEditorRef?.nativeElement;
       if (editor) {
         this.onDescriptionInput(editor);
       }
     }

     if (this.currentStep === 1) {
       if (!this.validateStep1BeforeContinue()) {
         this.errorMessage = 'Completa los campos obligatorios antes de continuar.';
         return;
       }
     }

    if (this.currentStep === 2) {
      if (!this.selectedImages.length) {
        this.errorMessage = 'Debes subir al menos una foto para continuar.';
        return;
      }

      if (!this.selectedImages.some((image) => image.isCover)) {
        this.errorMessage = 'Debes seleccionar una foto de portada (cover).';
        return;
      }
    }

    if (this.currentStep < this.maxStep) {
      this.errorMessage = '';
      this.currentStep += 1;
    }
  }

   goToPreviousStep(): void {
     // Si estamos en el step 3, sincronizar el contenido del editor al formulario
     if (this.currentStep === 3) {
       const editor = this.descriptionEditorRef?.nativeElement;
       if (editor) {
         this.onDescriptionInput(editor);
       }
     }

     if (this.currentStep > 1) {
       this.errorMessage = '';
       this.currentStep -= 1;
     }
   }

  openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  toggleFeatured(): void {
    this.isFeatured = !this.isFeatured;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (!files.length) {
      return;
    }

    const existingSignatures = new Set(
      this.selectedImages
        .filter((image): image is SelectedImageDraft & { file: File } => !!image.file)
        .map(({ file }) => `${file.name}-${file.size}-${file.lastModified}`)
    );

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue;
      }

      if (this.selectedImages.length >= this.maxAlbumImages) {
        break;
      }

      const signature = `${file.name}-${file.size}-${file.lastModified}`;
      if (existingSignatures.has(signature)) {
        continue;
      }

      existingSignatures.add(signature);
      this.selectedImages.push({
        file,
        fileName: file.name,
        filePath: '',
        previewUrl: URL.createObjectURL(file),
        isCover: false,
        isObjectUrl: true
      });
    }

    // Permite volver a elegir el mismo archivo en una selección posterior.
    input.value = '';
  }

  removeImage(index: number): void {
    const removed = this.selectedImages[index];
    if (!removed) {
      return;
    }

    if (removed.id) {
      this.deletedImageIds.add(removed.id);
    }

    if (removed.isObjectUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    this.selectedImages.splice(index, 1);
  }

  setCover(index: number): void {
    this.selectedImages = this.selectedImages.map((image, currentIndex) => ({
      ...image,
      isCover: currentIndex === index
    }));
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      if (!this.isSubmitting) {
        this.errorMessage = 'Revisa los campos obligatorios antes de guardar.';
      }
      return;
    }

    const title = (this.form.controls.title.value ?? '').trim();
    if (!title) {
      this.errorMessage = 'El titulo es obligatorio.';
      this.form.controls.title.markAsTouched();
      return;
    }

    const address = (this.form.controls.address.value ?? '').trim();
    if (!address) {
      this.errorMessage = 'La direccion es obligatoria.';
      this.form.controls.address.markAsTouched();
      return;
    }

    const priceDollars = Number(this.form.controls.priceDollars.value);
    const rawPriceSoles = this.form.controls.priceSoles.value;
    const priceSoles = rawPriceSoles === '' || rawPriceSoles === null
      ? null
      : Number(rawPriceSoles);

    const rawSecondPriceDollars = this.form.controls.secondPriceDollars.value;
    const secondPriceDollars = rawSecondPriceDollars === '' || rawSecondPriceDollars === null
      ? null
      : Number(rawSecondPriceDollars);

    const rawSecondPriceSoles = this.form.controls.secondPriceSoles.value;
    const secondPriceSoles = rawSecondPriceSoles === '' || rawSecondPriceSoles === null
      ? null
      : Number(rawSecondPriceSoles);

    const selectedDepartment = this.form.controls.department.value;
    if (!selectedDepartment) {
      this.errorMessage = 'Debes seleccionar un departamento.';
      this.form.controls.department.markAsTouched();
      return;
    }

    const department = selectedDepartment as Department;
    const selectedDistrict = this.form.controls.district.value;
    const district = department === Department.LIMA && selectedDistrict
      ? (selectedDistrict as District)
      : null;

    if (department !== Department.LIMA && selectedDistrict) {
      this.form.controls.district.setValue('' as District | '', { emitEvent: false });
    }

    if (department === Department.LIMA && !district) {
      this.errorMessage = 'Si el departamento es Lima, debes elegir un distrito.';
      this.form.controls.district.markAsTouched();
      return;
    }

    const selectedPropertyType = this.form.controls.propertyType.value;
    if (!selectedPropertyType) {
      this.errorMessage = 'Debes seleccionar un tipo de propiedad.';
      this.form.controls.propertyType.markAsTouched();
      return;
    }

    const selectedOperationType = this.form.controls.operationType.value;
    if (!selectedOperationType) {
      this.errorMessage = 'Debes seleccionar un tipo de operacion.';
      this.form.controls.operationType.markAsTouched();
      return;
    }

    const selectedStatusType = this.form.controls.statusType.value;
    if (!selectedStatusType) {
      this.errorMessage = 'Debes seleccionar un estado.';
      this.form.controls.statusType.markAsTouched();
      return;
    }

    const totalArea = Number(this.form.controls.totalArea.value);
    const builtArea = Number(this.form.controls.builtArea.value);


    const rawBedrooms = this.form.controls.bedrooms.value;
    const bedrooms = rawBedrooms === '' || rawBedrooms === null ? null : Number(rawBedrooms);

    const rawBathrooms = this.form.controls.bathrooms.value;
    const bathrooms = rawBathrooms === '' || rawBathrooms === null ? null : Number(rawBathrooms);

    const rawParkings = this.form.controls.parkings.value;
    const parkings = rawParkings === '' || rawParkings === null ? null : Number(rawParkings);

     const propertyType = selectedPropertyType as PropertyType;
     const operationType = selectedOperationType as OperationType;
     const statusType = selectedStatusType as StatusType;
     const rawAntique = this.form.controls.antique.value;
     const antique = rawAntique === '' || rawAntique === null ? null : Number(rawAntique);

    if (!this.selectedImages.length) {
      this.currentStep = 2;
      this.errorMessage = 'Debes subir al menos una foto para continuar.';
      return;
    }

    if (!this.selectedImages.some((image) => image.isCover)) {
      this.currentStep = 2;
      this.errorMessage = 'Debes seleccionar una foto de portada (cover).';
      return;
    }

    const descriptionHtml = this.form.controls.description.value ?? '';
    const plainTextForValidation = this.extractPlainText(descriptionHtml);

    if (!plainTextForValidation) {
      this.currentStep = 3;
      this.errorMessage = 'La descripcion es obligatoria.';
      this.form.controls.description.markAsTouched();
      return;
    }

    if (plainTextForValidation.length > 1000) {
      this.currentStep = 3;
      this.errorMessage = 'La descripcion no puede superar 1000 caracteres.';
      this.form.controls.description.markAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const filesToUpload = this.selectedImages
      .filter((image): image is SelectedImageDraft & { file: File } => !!image.file)
      .map((image) => image.file);

    this.propertiesService.uploadImages(filesToUpload).pipe(
      switchMap((uploadedImages) => {
        if (uploadedImages.length !== filesToUpload.length) {
          throw new Error('No se pudieron subir todas las imagenes seleccionadas.');
        }

        const albumImages = this.buildAlbumImages(uploadedImages);

         const baseRequest = {
           title,
           priceDollars,
           priceSoles,
           secondPriceDollars,
           secondPriceSoles,
           department,
           district,
           address,
           propertyType,
           operationType,
           totalArea,
           builtArea,
           bedrooms,
           bathrooms,
           parkings,
           description: descriptionHtml,
           antique,
           statusType,
           featured: this.isFeatured,
           tags: Array.from(this.selectedTags)
         };

        if (this.dialogMode === 'edit' && this.editingProperty) {
          const updateRequest = this.buildUpdateRequest(baseRequest, albumImages);
          return this.propertiesService.update(this.editingProperty.id, updateRequest);
        }

        const createRequest: CreatePropertyRequest = {
          ...baseRequest,
          images: albumImages
        };

        return this.propertiesService.create(createRequest);
      })
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.close(this.dialogMode === 'edit' ? { updated: true } : { created: true });
      },
      error: (error: Error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message;
      }
    });
  }

  close(result?: NewPropertyDialogResult): void {
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;
    this.dialogRef.addPanelClass('new-property-dialog-closing');

    // Delay the actual close so the closing animation can finish.
    setTimeout(() => this.dialogRef.close(result), 220);
  }

  ngOnDestroy(): void {
    this.selectedImages
      .filter((image) => image.isObjectUrl)
      .forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }

  applyDescriptionFormat(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList', editor: HTMLElement): void {
    editor.focus();
    document.execCommand(command);
    this.onDescriptionInput(editor);
  }

  onDescriptionInput(editor: HTMLElement): void {
    const html = editor.innerHTML.trim() === '<br>' ? '' : editor.innerHTML;
    this.form.controls.description.setValue(html, { emitEvent: false });
  }

  toggleTag(tag: Tag): void {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
      return;
    }

    this.selectedTags.add(tag);
  }

  isTagSelected(tag: Tag): boolean {
    return this.selectedTags.has(tag);
  }

  private extractPlainText(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.textContent ?? '').trim();
  }

   private patchFormFromProperty(property: PropertyEntity): void {
     console.log('[DEBUG] description patched:', property.description);
     this.form.patchValue({
       title: property.title,
       priceDollars: String(property.priceDollars),
       priceSoles: property.priceSoles === null || property.priceSoles === undefined ? '' : String(property.priceSoles),
       address: property.address,
       department: property.department,
       district: property.district ?? '',
       propertyType: property.propertyType,
       operationType: property.operationType,
       totalArea: String(property.totalArea),
       builtArea: String(property.builtArea),
       bedrooms: property.bedrooms === null || property.bedrooms === undefined ? '' : String(property.bedrooms),
       bathrooms: property.bathrooms === null || property.bathrooms === undefined ? '' : String(property.bathrooms),
       parkings: property.parkings === null || property.parkings === undefined ? '' : String(property.parkings),
       statusType: property.statusType,
       antique: property.antique === null || property.antique === undefined ? '' : String(property.antique),
       description: property.description
     });

    this.isFeatured = property.featured;
    this.selectedTags.clear();
    property.tags.forEach((tag) => this.selectedTags.add(tag));
    this.deletedImageIds.clear();
    this.selectedImages = property.images.map((image) => ({
      id: image.id,
      fileName: image.fileName,
      filePath: image.filePath,
      previewUrl: this.resolvePreviewUrl(image.filePath),
      isCover: image.cover,
      isObjectUrl: false
    }));
  }

  private resolvePreviewUrl(rawPath: string): string {
    if (!rawPath) {
      return 'https://via.placeholder.com/640x360?text=Sin+imagen';
    }

    const normalizedPath = rawPath.replace(/\\/g, '/').trim();
    if (!normalizedPath) {
      return 'https://via.placeholder.com/640x360?text=Sin+imagen';
    }

    if (/^(https?:|data:|blob:)/i.test(normalizedPath)) {
      return normalizedPath;
    }

    if (normalizedPath.startsWith('pending-upload/')) {
      return 'https://via.placeholder.com/640x360?text=Sin+imagen';
    }

    const apiBase = environment.serverBasePath;
    const serverOrigin = apiBase.replace(/\/api\/v\d+$/i, '');
    const cleanPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
    return `${serverOrigin}${cleanPath}`;
  }

  private buildAlbumImages(uploadedImages: ImageUploadResource[]): CreatePropertyRequest['images'] {
    let uploadedIndex = 0;

    return this.selectedImages.map((image, index) => {
      if (image.file) {
        const uploaded = uploadedImages[uploadedIndex++];

        if (!uploaded) {
          throw new Error('No se pudo resolver la imagen subida.');
        }

        return {
          id: image.id,
          fileName: uploaded.fileName,
          filePath: uploaded.filePath,
          displayOrder: index + 1,
          cover: image.isCover,
          isCover: image.isCover
        };
      }

      return {
        id: image.id,
        fileName: image.fileName,
        filePath: image.filePath,
        displayOrder: index + 1,
        cover: image.isCover,
        isCover: image.isCover
      };
    });
  }

  private buildUpdateRequest(
    baseRequest: Omit<CreatePropertyRequest, 'images'>,
    albumImages: CreatePropertyRequest['images']
  ): UpdatePropertyRequest {
    const newImages = albumImages
      .filter((image) => !image.id)
      .map((image) => ({
        fileName: image.fileName,
        filePath: image.filePath,
        displayOrder: image.displayOrder,
        cover: !!image.cover
      }));

    const updatedImages = albumImages
      .filter((image): image is CreatePropertyRequest['images'][number] & { id: number } => !!image.id)
      .map((image) => ({
        imageId: image.id,
        fileName: image.fileName,
        filePath: image.filePath,
        displayOrder: image.displayOrder,
        cover: !!image.cover
      }));

    const deletedImages = Array.from(this.deletedImageIds).map((imageId) => ({ imageId }));

    return {
      ...baseRequest,
      newImages,
      updatedImages,
      deletedImages
    };
  }

   shouldShowFieldInvalid(fieldName:
     'title' | 'priceDollars' | 'address' | 'department' | 'district' |
     'propertyType' | 'operationType' | 'totalArea' | 'builtArea' | 'statusType' | 'antique'
   ): boolean {
    if (!this.step1ValidationAttempted || this.currentStep !== 1) {
      return false;
    }

    if (fieldName === 'district') {
      return this.form.controls.department.value === Department.LIMA && this.isEmptyValue(this.form.controls.district.value);
    }

    return this.isEmptyValue(this.form.controls[fieldName].value);
  }

  private isEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === 'string') {
      return value.trim() === '';
    }

    return false;
  }

  private validateStep1BeforeContinue(): boolean {
    this.step1ValidationAttempted = true;

    this.form.controls.title.markAsTouched();
    this.form.controls.priceDollars.markAsTouched();
    this.form.controls.address.markAsTouched();
    this.form.controls.department.markAsTouched();
    this.form.controls.propertyType.markAsTouched();
    this.form.controls.operationType.markAsTouched();
    this.form.controls.totalArea.markAsTouched();
    this.form.controls.builtArea.markAsTouched();
    this.form.controls.statusType.markAsTouched();

    if (this.form.controls.department.value === Department.LIMA) {
      this.form.controls.district.markAsTouched();
    }

    const hasMissingRequired =
      this.isEmptyValue(this.form.controls.title.value) ||
      this.isEmptyValue(this.form.controls.priceDollars.value) ||
      this.isEmptyValue(this.form.controls.address.value) ||
      this.isEmptyValue(this.form.controls.department.value) ||
      this.isEmptyValue(this.form.controls.propertyType.value) ||
      this.isEmptyValue(this.form.controls.operationType.value) ||
      this.isEmptyValue(this.form.controls.totalArea.value) ||
      this.isEmptyValue(this.form.controls.builtArea.value) ||
      this.isEmptyValue(this.form.controls.statusType.value) ||
      (this.form.controls.department.value === Department.LIMA && this.isEmptyValue(this.form.controls.district.value));

    return !hasMissingRequired;
  }

  private buildTagGroups(): Array<{ category: TagCategory; categoryLabel: string; tags: Array<{ value: Tag; label: string }> }> {
    const categoriesOrder: TagCategory[] = [
      TagCategory.MAS_AMBIENTES,
      TagCategory.SERVICIOS,
      TagCategory.EXTRAS
    ];

    return categoriesOrder.map((category) => {
      const tags = (Object.values(Tag) as Tag[])
        .filter((tag) => TagMetadata[tag].category === category)
        .map((tag) => ({ value: tag, label: TagMetadata[tag].label }));

      return {
        category,
        categoryLabel: this.getCategoryLabel(category),
        tags
      };
    });
  }

  private getCategoryLabel(category: TagCategory): string {
    if (category === TagCategory.MAS_AMBIENTES) {
      return 'Mas ambientes';
    }

    if (category === TagCategory.SERVICIOS) {
      return 'Servicios';
    }

    return 'Extras';
  }
}
