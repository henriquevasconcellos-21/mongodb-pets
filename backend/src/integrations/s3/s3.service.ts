import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

const AWS_REGION_KEY = 'AWS_REGION';
const AWS_S3_BUCKET_KEY = 'AWS_S3_BUCKET';

@Injectable()
export class S3Service {
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>(AWS_REGION_KEY),
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const bucket = this.configService.get<string>(AWS_S3_BUCKET_KEY);
    const region = this.configService.get<string>(AWS_REGION_KEY);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
  }
}
