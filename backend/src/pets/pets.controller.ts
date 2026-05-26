import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PetsService, Pet } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { GetPetsFilterDto } from './dto/get-pets-filter.dto';
import { PetResponse } from './dto/pet-response.dto';
import 'multer';

const PETS_ROUTE = 'pets';
const BREEDS_ROUTE = 'breeds';
const IMAGE_FIELD = 'image';
const S3_ERROR_PREFIX = '[S3] Upload failed:';
const S3_UPLOAD_ERROR_MSG = 'Failed to upload image to S3';
const PET_NOT_FOUND_MSG = 'Pet not found';

@Controller(PETS_ROUTE)
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get(BREEDS_ROUTE)
  async getBreeds(): Promise<string[]> {
    return this.petsService.getUniqueBreeds();
  }

  @Post()
  @UseInterceptors(FileInterceptor(IMAGE_FIELD))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createPetDto: CreatePetDto,
  ): Promise<Pet> {
    let imageUrl = '';

    if (file) {
      try {
        imageUrl = await this.petsService.uploadImage(file);
      } catch (error) {
        console.error(S3_ERROR_PREFIX, error);
        throw new HttpException(S3_UPLOAD_ERROR_MSG, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    return this.petsService.create({
      ...createPetDto,
      image: imageUrl,
    } as Pet);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor(IMAGE_FIELD))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updatePetDto: UpdatePetDto,
  ): Promise<Pet> {
    const updateData: any = { ...updatePetDto };

    if (file) {
      try {
        updateData.image = await this.petsService.uploadImage(file);
      } catch (error) {
        console.error(S3_ERROR_PREFIX, error);
        throw new HttpException(S3_UPLOAD_ERROR_MSG, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    const updatedPet = await this.petsService.update(id, updateData);
    if (!updatedPet) {
      throw new HttpException(PET_NOT_FOUND_MSG, HttpStatus.NOT_FOUND);
    }
    return updatedPet;
  }

  @Get()
  async findAll(@Query() filterDto: GetPetsFilterDto): Promise<PetResponse> {
    return this.petsService.findAll(filterDto);
  }
}
